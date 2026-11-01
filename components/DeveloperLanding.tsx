'use client';

// The Developer API landing page: what someone sees before they turn developer
// access on.
//
// The design is built around the three things the old page failed to answer, in
// the order a visitor asks them:
//
//   1. What is this, in one line?
//   2. Which of my accounts does it attach to?
//   3. What could I actually build?
//
// So the signed-in account is not a footnote, it sits directly under the
// headline — the most common confusion was people thinking this created a
// second account. The feature cards carry small diagrams of the actual
// mechanism rather than decorative icons, because "push a call from a game
// server" means nothing until you can see the shape of it.
//
// Visual language is the product's own: a dispatch console. Dark surfaces,
// monospace for anything a machine produced (keys, codes, limits, payloads),
// sans for prose. That is a choice the subject earns rather than one imported
// from elsewhere, and it matches the console pages already in the site.
//
// Nothing here advertises a capability that does not ship. There are no
// webhooks and no sandbox in this release, so neither is mentioned.

import { useMemo } from 'react';

type DeveloperTier = {
  plan: string;
  limits: {
    requestsPerMinute: number;
    requestsPerDay: number;
    keysPerDeveloper: number;
    accountsPerKeyDay: number;
    communitiesPerKeyDay: number;
  };
};

type CommunityPlan = { plan: string; cap: number; unlimited: boolean };

type WebsiteTier = {
  name: string;
  key: string;
  monthlyPrice: number;
  annualPrice: number;
  onSale?: boolean;
  originalMonthlyPrice?: number;
};

type Entitlement = {
  plan: string;
  source: string;
  websitePlan: string;
  lapsed: boolean;
};

export type LandingData = {
  tiers?: DeveloperTier[];
  communityPlans?: CommunityPlan[];
  websiteTiers?: WebsiteTier[];
  upgradeUrl?: string;
  entitlement?: Entitlement;
  communities?: { plan: string; owned: number; cap: number; unlimited: boolean };
};

type SessionUser = {
  username?: string;
  email?: string;
  profilePicture?: string;
};

// maskEmail mirrors the API's masking. Shown even on a page only you can see,
// because people screenshot this page when asking for help.
function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at <= 0) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (local.length === 1) return `*@${domain}`;
  if (local.length <= 4) return `${local[0]}${'*'.repeat(local.length - 1)}@${domain}`;
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  base: 'Base',
  premium: 'Premium',
  premium_plus: 'Premium Plus',
};

function planLabel(plan: string): string {
  return PLAN_LABELS[plan] || plan;
}

function money(n: number): string {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

function compact(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : String(n);
}

// ---- diagrams ----
//
// Each one draws the mechanism the card describes, at a size where the shape
// reads before the label does. Hand-rolled SVG rather than an icon set, because
// an icon set has no picture of "a call arriving on a dispatch board".

function CallsDiagram() {
  return (
    <svg viewBox="0 0 120 64" className="dl-diagram" role="img" aria-label="A call pushed from a game server appearing on the dispatch board">
      <rect x="1" y="14" width="34" height="36" rx="5" fill="rgba(56,189,248,0.10)" stroke="rgba(56,189,248,0.45)" />
      <text x="18" y="36" textAnchor="middle" className="dl-diagram-tag">game</text>
      <path d="M38 32h38" stroke="rgba(56,189,248,0.7)" strokeWidth="1.5" strokeDasharray="3 3" />
      <path d="m74 28 5 4-5 4z" fill="rgba(56,189,248,0.9)" />
      <rect x="82" y="8" width="37" height="48" rx="5" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.14)" />
      <rect x="87" y="14" width="27" height="6" rx="2" fill="rgba(248,113,113,0.65)" />
      <rect x="87" y="25" width="27" height="5" rx="2" fill="rgba(255,255,255,0.18)" />
      <rect x="87" y="34" width="20" height="5" rx="2" fill="rgba(255,255,255,0.12)" />
      <rect x="87" y="43" width="23" height="5" rx="2" fill="rgba(255,255,255,0.12)" />
    </svg>
  );
}

function UnitsDiagram() {
  return (
    <svg viewBox="0 0 120 64" className="dl-diagram" role="img" aria-label="Unit status pills changing from available to on scene">
      <rect x="1" y="6" width="54" height="16" rx="8" fill="rgba(52,211,153,0.14)" stroke="rgba(52,211,153,0.5)" />
      <text x="28" y="17" textAnchor="middle" className="dl-diagram-tag">10-8</text>
      <rect x="1" y="26" width="54" height="16" rx="8" fill="rgba(251,191,36,0.14)" stroke="rgba(251,191,36,0.5)" />
      <text x="28" y="37" textAnchor="middle" className="dl-diagram-tag">10-23</text>
      <rect x="1" y="46" width="54" height="16" rx="8" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.14)" />
      <text x="28" y="57" textAnchor="middle" className="dl-diagram-tag">10-7</text>
      <path d="M60 34h14" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="3 3" />
      <rect x="78" y="22" width="41" height="24" rx="5" fill="rgba(56,189,248,0.10)" stroke="rgba(56,189,248,0.45)" />
      <text x="98" y="37" textAnchor="middle" className="dl-diagram-tag">1 call</text>
    </svg>
  );
}

function RecordsDiagram() {
  return (
    <svg viewBox="0 0 120 64" className="dl-diagram" role="img" aria-label="A character made in game appearing on the website and in the app">
      <rect x="1" y="20" width="30" height="24" rx="4" fill="rgba(56,189,248,0.10)" stroke="rgba(56,189,248,0.45)" />
      <circle cx="16" cy="29" r="4" fill="rgba(56,189,248,0.8)" />
      <rect x="7" y="36" width="18" height="3" rx="1.5" fill="rgba(56,189,248,0.55)" />
      <path d="M34 32h12" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="3 3" />
      <rect x="50" y="6" width="32" height="22" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.14)" />
      <rect x="56" y="13" width="20" height="3" rx="1.5" fill="rgba(255,255,255,0.22)" />
      <rect x="56" y="19" width="14" height="3" rx="1.5" fill="rgba(255,255,255,0.14)" />
      <rect x="88" y="34" width="20" height="28" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.14)" />
      <rect x="93" y="40" width="10" height="3" rx="1.5" fill="rgba(255,255,255,0.22)" />
      <rect x="93" y="46" width="10" height="3" rx="1.5" fill="rgba(255,255,255,0.14)" />
      <path d="M68 30v14h16" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" fill="none" />
      <path d="M50 34v6h32" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

function KeysDiagram() {
  return (
    <svg viewBox="0 0 120 64" className="dl-diagram" role="img" aria-label="One key granted to one community, with other communities out of reach">
      <circle cx="16" cy="32" r="8" fill="none" stroke="rgba(251,191,36,0.8)" strokeWidth="2" />
      <path d="M24 32h16" stroke="rgba(251,191,36,0.8)" strokeWidth="2" />
      <path d="M34 32v5M39 32v5" stroke="rgba(251,191,36,0.8)" strokeWidth="2" />
      <rect x="52" y="4" width="66" height="16" rx="5" fill="rgba(52,211,153,0.12)" stroke="rgba(52,211,153,0.5)" />
      <text x="85" y="15" textAnchor="middle" className="dl-diagram-tag">granted</text>
      <rect x="52" y="24" width="66" height="16" rx="5" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.10)" strokeDasharray="3 3" />
      <text x="85" y="35" textAnchor="middle" className="dl-diagram-tag dl-diagram-tag-dim">no access</text>
      <rect x="52" y="44" width="66" height="16" rx="5" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.10)" strokeDasharray="3 3" />
      <text x="85" y="55" textAnchor="middle" className="dl-diagram-tag dl-diagram-tag-dim">no access</text>
    </svg>
  );
}

const BUILD_CARDS = [
  {
    diagram: <CallsDiagram />,
    title: 'Push live game activity in',
    body: 'Create and close calls from your FiveM server as they happen. Address them by your own id, so a reconnect or a retried request never puts a second call on the board.',
  },
  {
    diagram: <UnitsDiagram />,
    title: 'Drive the unit board',
    body: 'Set officers on duty, on scene or unavailable. One bulk call per tick covers a full server, instead of one request per player.',
  },
  {
    diagram: <RecordsDiagram />,
    title: 'Let players keep what they made',
    body: 'Characters, vehicles, firearms and licences created in game show up on the website and in the app. Players claim the account and it is theirs.',
  },
  {
    diagram: <KeysDiagram />,
    title: 'Keys scoped to one community',
    body: 'A key reaches only the communities that granted it, and only the scopes you picked. Owners can withdraw access whenever they want.',
  },
];

const WHY_POINTS = [
  ['One identity', 'The same account on the website, the app and the API. No second login to keep track of.'],
  ['Your plan carries over', "Your subscription's community limit is the limit, whether you make a community by hand or with a key."],
  ['Tied to your communities', 'Keys work where you have been granted access, and nowhere else.'],
  ['See what your key is doing', 'Request counts, which endpoints, and which communities, per key, per day.'],
  ['Off whenever you like', 'Turning developer access off revokes every key immediately.'],
];

export default function DeveloperLanding({
  data,
  user,
  appName,
  appUrl,
  acceptTerms,
  busy,
  onAppName,
  onAppURL,
  onAcceptTerms,
  onEnable,
}: {
  data: LandingData;
  user: SessionUser | null;
  appName: string;
  appUrl: string;
  acceptTerms: boolean;
  busy: boolean;
  onAppName: (v: string) => void;
  onAppURL: (v: string) => void;
  onAcceptTerms: (v: boolean) => void;
  onEnable: () => void;
}) {
  const tiers = data.tiers || [];
  const capByPlan = useMemo(() => {
    const m: Record<string, CommunityPlan> = {};
    (data.communityPlans || []).forEach((p) => {
      m[p.plan] = p;
    });
    return m;
  }, [data.communityPlans]);
  const priceByPlan = useMemo(() => {
    const m: Record<string, WebsiteTier> = {};
    (data.websiteTiers || []).forEach((t) => {
      m[t.key] = t;
    });
    return m;
  }, [data.websiteTiers]);

  const current = data.entitlement?.plan || '';
  // /pricing sells the user subscription, which is what API limits follow.
  // /community-pricing sells community promotions — a different product, and
  // what this used to point at.
  const upgradeUrl = data.upgradeUrl || '/pricing';
  // One class for every cell in the plan someone is actually on, so the column
  // reads as a column rather than a highlighted header with nothing under it.
  const cell = (plan: string) => (plan === current ? 'dl-mono dl-cell-current' : 'dl-mono');
  const initial = (user?.username || user?.email || '?').trim().charAt(0).toUpperCase();

  return (
    <>
      {/* Hero. One line and a subline, because a paragraph here was the single
          biggest complaint about the old page. */}
      <section className="dl-hero">
        <h1 className="dl-title">Your CAD, driven from inside the game.</h1>
        <p className="dl-lede">
          Build against Lines Police CAD with a key scoped to the communities that let you in.
        </p>
        <div className="dl-cta-row">
          <a className="dl-btn" href="#turn-on">
            Turn on developer access
          </a>
          <a className="dl-btn dl-btn-ghost" href="/api-docs">
            Read the docs
          </a>
        </div>
      </section>

      {/* Which account. Directly under the hero rather than near the form,
          because "is this a separate account?" is the question people actually
          arrive with. */}
      <section className="dl-account" aria-label="The account developer access attaches to">
        <div className="dl-account-id">
          {user?.profilePicture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="dl-avatar" src={user.profilePicture} alt="" />
          ) : (
            <span className="dl-avatar dl-avatar-fallback" aria-hidden="true">
              {initial}
            </span>
          )}
          <span className="dl-account-text">
            <strong className="dl-account-name">{user?.username || 'Your account'}</strong>
            {user?.email && <span className="dl-account-email dl-mono">{maskEmail(user.email)}</span>}
          </span>
        </div>
        <p className="dl-account-note">
          This adds developer access to your existing LPC account. Not a separate account.{' '}
          <a href="/logout" className="dl-inline-link">
            Not you? Switch account
          </a>
        </p>
      </section>

      {/* What you can build. */}
      <section className="dl-section" aria-labelledby="dl-build">
        <h2 className="dl-h2" id="dl-build">
          What you can build
        </h2>
        <div className="dl-build-grid">
          {BUILD_CARDS.map((card) => (
            <article className="dl-build-card" key={card.title}>
              <div className="dl-diagram-wrap">{card.diagram}</div>
              <h3 className="dl-build-title">{card.title}</h3>
              <p className="dl-build-body">{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Why. Reasons, not features, so a list rather than more cards. */}
      <section className="dl-section" aria-labelledby="dl-why">
        <h2 className="dl-h2" id="dl-why">
          Why it is on your own account
        </h2>
        <ul className="dl-why">
          {WHY_POINTS.map(([title, body]) => (
            <li className="dl-why-item" key={title}>
              <span className="dl-why-mark" aria-hidden="true" />
              <span>
                <strong className="dl-why-title">{title}</strong>
                <span className="dl-why-body">{body}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Limits. Every number comes from the API, which reads the same table the
          middleware enforces, so this cannot drift from what actually happens. */}
      {tiers.length > 0 && (
        <section className="dl-section" aria-labelledby="dl-limits">
          <h2 className="dl-h2" id="dl-limits">
            Your subscription sets your limits
          </h2>
          <p className="dl-section-note">
            There is no separate Developer API subscription. Your API allowance follows the plan
            you already have, and a community made with a key counts exactly like one made by
            hand.
          </p>

          <div className="dl-table-wrap">
            <div className="dl-table-scroll">
            <table className="dl-table">
              <caption className="dl-sr-only">
                Developer API limits and community allowance for each website plan
              </caption>
              <thead>
                <tr>
                  <th scope="col"><span className="dl-sr-only">Limit</span></th>
                  {tiers.map((t) => (
                    <th scope="col" key={t.plan} className={t.plan === current ? 'dl-col-current' : undefined}>
                      <span className="dl-col-plan">{planLabel(t.plan)}</span>
                      <span className="dl-col-price dl-mono">
                        {priceByPlan[t.plan]
                          ? priceByPlan[t.plan].monthlyPrice === 0
                            ? 'included'
                            : `${money(priceByPlan[t.plan].monthlyPrice)}/mo`
                          : '—'}
                      </span>
                      {t.plan === current && <span className="dl-col-badge">Your plan</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Requests per minute</th>
                  {tiers.map((t) => (
                    <td key={t.plan} className={cell(t.plan)}>{t.limits.requestsPerMinute}</td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Requests per day</th>
                  {tiers.map((t) => (
                    <td key={t.plan} className={cell(t.plan)}>{compact(t.limits.requestsPerDay)}</td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Keys</th>
                  {tiers.map((t) => (
                    <td key={t.plan} className={cell(t.plan)}>{t.limits.keysPerDeveloper}</td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">
                    Player accounts <span className="dl-row-note">per key, per day</span>
                  </th>
                  {tiers.map((t) => (
                    <td key={t.plan} className={cell(t.plan)}>{t.limits.accountsPerKeyDay}</td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">
                    New communities <span className="dl-row-note">per key, per day</span>
                  </th>
                  {tiers.map((t) => (
                    <td key={t.plan} className={cell(t.plan)}>{t.limits.communitiesPerKeyDay}</td>
                  ))}
                </tr>
                <tr className="dl-row-split">
                  <th scope="row">
                    Communities you can own <span className="dl-row-note">from your plan</span>
                  </th>
                  {tiers.map((t) => {
                    const cap = capByPlan[t.plan];
                    return (
                      <td key={t.plan} className={cell(t.plan)}>
                        {cap ? (cap.unlimited ? 'unlimited' : cap.cap) : '—'}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
              </table>
            </div>
          </div>

          <p className="dl-section-note">
            {data.communities && (
              <>
                You own <strong>{data.communities.owned}</strong> of{' '}
                <strong>
                  {data.communities.unlimited ? 'unlimited' : data.communities.cap}
                </strong>{' '}
                on {planLabel(data.communities.plan)}.{' '}
              </>
            )}
            {data.entitlement?.lapsed && (
              <>
                Your {planLabel(data.entitlement.websitePlan)} subscription has lapsed, so your
                limits are back to Free.{' '}
              </>
            )}
            <a className="dl-inline-link" href={upgradeUrl}>
              Compare plans
            </a>
          </p>
        </section>
      )}

      {/* How it works. Numbered because it genuinely is a sequence. */}
      <section className="dl-section" aria-labelledby="dl-how">
        <h2 className="dl-h2" id="dl-how">
          How it works
        </h2>
        <ol className="dl-steps">
          <li className="dl-step">
            <span className="dl-step-n dl-mono">1</span>
            <span>
              <strong className="dl-step-title">Turn on developer access</strong>
              <span className="dl-step-body">On this page. It stays on your own account.</span>
            </span>
          </li>
          <li className="dl-step">
            <span className="dl-step-n dl-mono">2</span>
            <span>
              <strong className="dl-step-title">Create a key for a community</strong>
              <span className="dl-step-body">
                Pick its scopes. You see the key once, so save it somewhere safe.
              </span>
            </span>
          </li>
          <li className="dl-step">
            <span className="dl-step-n dl-mono">3</span>
            <span>
              <strong className="dl-step-title">Call the API</strong>
              <span className="dl-step-body">Send the key as a bearer token.</span>
            </span>
          </li>
        </ol>
        <pre className="dl-code dl-mono" aria-label="Example request">
          <code>{`curl -X POST \\
  "$LPC_API/api/v1/dev/communities/$ID/dispatch/calls" \\
  -H "Authorization: Bearer lpc_live_..." \\
  -d '{"externalId":"cad-1042","title":"Shots fired"}'`}</code>
        </pre>
      </section>

      {/* The enable panel, at the end, where someone who has read the page is
          ready to act. */}
      <section className="dl-enable" id="turn-on" aria-labelledby="dl-enable-h">
        <h2 className="dl-h2" id="dl-enable-h">
          Turn on developer access
        </h2>
        <p className="dl-section-note">
          Free, and you can turn it off whenever you like. Turning it off revokes every key you
          hold.
        </p>

        <div className="dl-fields">
          <div>
            <label className="dev-label" htmlFor="dev-app-name">
              What are you building? (optional)
            </label>
            <input
              id="dev-app-name"
              className="dev-input"
              value={appName}
              onChange={(e) => onAppName(e.target.value)}
              placeholder="My FiveM server"
              maxLength={80}
            />
          </div>
          <div>
            <label className="dev-label" htmlFor="dev-app-url">
              Project link (optional)
            </label>
            <input
              id="dev-app-url"
              className="dev-input"
              value={appUrl}
              onChange={(e) => onAppURL(e.target.value)}
              placeholder="https://"
              maxLength={200}
            />
          </div>
          <label className="dl-terms" htmlFor="dev-terms">
            <input
              id="dev-terms"
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => onAcceptTerms(e.target.checked)}
            />
            <span>
              I accept the{' '}
              <a href="/terms-and-conditions#developers-and-the-developer-api" className="dl-inline-link">
                Developer Terms
              </a>
              . I understand a key can create accounts for my players, and that I am responsible
              for how my integration uses them.
            </span>
          </label>
          <div>
            <button
              type="button"
              className="dl-btn"
              disabled={!acceptTerms || busy}
              onClick={onEnable}
            >
              Turn on developer access
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
