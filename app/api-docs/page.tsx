'use client';

/**
 * The public Developer API docs.
 *
 * Public on purpose: a developer deciding whether to build against us should be
 * able to read the whole contract before making an account, and a mod author
 * debugging at 2am should be able to search it without signing in.
 *
 * It is the quickstart from the API repo, written for the browser. The
 * authoritative copy lives at docs/developer-api/QUICKSTART.md next to the
 * code; when they disagree, the repo is right and this is stale.
 */

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const SECTIONS = [
  { id: 'start', label: 'Getting started' },
  { id: 'quickstart', label: 'Quickstart' },
  { id: 'fivem', label: 'FiveM example' },
  { id: 'limits', label: 'Rate limits' },
  { id: 'scopes', label: 'Scopes' },
  { id: 'errors', label: 'Errors' },
  { id: 'never', label: 'What a key cannot do' },
];

function Code({ children, lang }: { children: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="doc-code-wrap">
      <button
        type="button"
        className="doc-copy"
        onClick={() => {
          navigator.clipboard?.writeText(children).then(
            () => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            },
            () => setCopied(false)
          );
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
      {lang && <span className="doc-lang">{lang}</span>}
      <pre className="doc-code">
        <code>{children}</code>
      </pre>
    </div>
  );
}

const FIVEM_LUA = `-- server.lua
local LPC_BASE      = "https://api.linespolice-cad.com/api/v1/dev"
local LPC_KEY       = GetConvar("lpc_api_key", "")        -- set (not setr) in server.cfg
local LPC_COMMUNITY = GetConvar("lpc_community_id", "")

local function lpc(method, path, body, cb)
  PerformHttpRequest(LPC_BASE .. path, function(status, text, _)
    local ok, decoded = pcall(json.decode, text or "")
    if not ok then decoded = nil end
    if status == 429 then
      print(("[lpc] rate limited: %s"):format(text or ""))
    elseif status >= 400 then
      print(("[lpc] %s %s -> %d %s"):format(method, path, status, text or ""))
    end
    if cb then cb(status, decoded) end
  end, method, body and json.encode(body) or "", {
    ["Content-Type"]  = "application/json",
    ["Authorization"] = "Bearer " .. LPC_KEY,
  })
end

local function licenseOf(src)
  for _, id in ipairs(GetPlayerIdentifiers(src)) do
    if id:sub(1, 8) == "license:" then return id end
  end
  return nil
end

local players = {}

AddEventHandler("playerJoining", function()
  local src, license = source, licenseOf(source)
  if not license then return end

  -- Idempotent: safe on every connect.
  lpc("POST", "/players", {
    provider = "fivem", identifier = license, username = GetPlayerName(src),
  }, function(status, body)
    if status ~= 200 and status ~= 201 then return end
    players[src] = { ref = body.player.playerRef, claimed = body.player.claimed }

    if not body.player.claimed then
      lpc("POST", ("/players/fivem/%s/claim-code"):format(license:sub(9)), nil,
        function(codeStatus, codeBody)
          if codeStatus ~= 201 then return end
          TriggerClientEvent("chat:addMessage", src, {
            color = { 255, 200, 0 },
            args = { "LPC", ("Link your characters at %s with code %s")
                             :format(codeBody.url, codeBody.code) },
          })
        end)
    end
  end)
end)

AddEventHandler("playerDropped", function() players[source] = nil end)

-- One bulk call per tick, never one call per player.
CreateThread(function()
  while true do
    Wait(15000)
    local units = {}
    for src, player in pairs(players) do
      local ped = GetPlayerPed(src)
      if ped and ped ~= 0 then
        units[#units + 1] = {
          player   = player.ref,
          location = GetNameOfZone(table.unpack(GetEntityCoords(ped))),
        }
      end
    end
    for i = 1, #units, 100 do
      local chunk = {}
      for j = i, math.min(i + 99, #units) do chunk[#chunk + 1] = units[j] end
      lpc("PUT", ("/communities/%s/units/status/bulk"):format(LPC_COMMUNITY), { units = chunk })
    end
  end
end)`;

export default function ApiDocsPage() {
  return (
    <>
      <style jsx global>{`
        :root {
          --rp-bg: #08090c;
          --rp-surface: #0e1117;
          --rp-glass: rgba(255, 255, 255, 0.04);
          --rp-glass-border: rgba(255, 255, 255, 0.08);
          --rp-text: #e2e8f0;
          --rp-text-muted: #94a3b8;
          --rp-text-dim: #64748b;
          --rp-accent: #38bdf8;
          --rp-amber: #fbbf24;
          --rp-red: #f87171;
          --rp-radius: 12px;
        }
        .doc-page {
          background: var(--rp-bg);
          color: var(--rp-text);
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          min-height: 100vh;
        }
        .doc-shell {
          max-width: 1100px; margin: 0 auto; padding: 2.5rem 1.25rem 6rem;
          display: grid; grid-template-columns: 200px minmax(0, 1fr); gap: 3rem;
        }
        .doc-nav { position: sticky; top: 1.5rem; align-self: start; }
        .doc-nav a {
          display: block; padding: 0.4rem 0; color: var(--rp-text-muted);
          text-decoration: none; font-size: 0.9rem; border-left: 2px solid transparent; padding-left: 0.75rem;
        }
        .doc-nav a:hover { color: var(--rp-text); border-left-color: var(--rp-accent); }
        .doc-body { min-width: 0; }
        .doc-h1 { font-size: 2.1rem; font-weight: 800; margin: 0 0 0.5rem; letter-spacing: -0.02em; }
        .doc-lede { color: var(--rp-text-muted); line-height: 1.7; max-width: 68ch; margin: 0 0 2.5rem; font-size: 1.02rem; }
        .doc-h2 {
          font-size: 1.3rem; font-weight: 700; margin: 3rem 0 1rem;
          padding-top: 1.5rem; border-top: 1px solid var(--rp-glass-border);
          scroll-margin-top: 1.5rem;
        }
        .doc-h3 { font-size: 1rem; font-weight: 700; margin: 2rem 0 0.75rem; }
        .doc-body p { color: var(--rp-text-muted); line-height: 1.75; max-width: 68ch; }
        .doc-body li { color: var(--rp-text-muted); line-height: 1.75; }
        .doc-body a { color: var(--rp-accent); }
        .doc-body strong { color: var(--rp-text); }
        .doc-code-wrap { position: relative; margin: 1rem 0 1.5rem; }
        .doc-code {
          background: #04070b; border: 1px solid var(--rp-glass-border);
          border-radius: 10px; padding: 1.1rem 1.1rem; overflow-x: auto;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 0.84rem; line-height: 1.65; color: #cbd5e1; margin: 0;
        }
        .doc-copy {
          position: absolute; top: 0.6rem; right: 0.6rem; z-index: 2;
          padding: 0.25rem 0.6rem; border-radius: 6px; cursor: pointer;
          background: var(--rp-glass); border: 1px solid var(--rp-glass-border);
          color: var(--rp-text-muted); font-family: inherit; font-size: 0.75rem;
        }
        .doc-copy:hover { color: var(--rp-text); }
        .doc-lang {
          position: absolute; top: 0.7rem; left: 1.1rem;
          font-size: 0.7rem; letter-spacing: 0.06em; color: var(--rp-text-dim);
        }
        .doc-lang + .doc-code { padding-top: 2rem; }

        /* app/globals.css strips outlines from every a and button, so focus
           has to be put back explicitly or the page is unusable by keyboard. */
        .doc-body a:focus-visible,
        .doc-copy:focus-visible {
          outline: 2px solid var(--rp-accent);
          outline-offset: 2px;
          border-radius: 4px;
        }
        .doc-table { width: 100%; border-collapse: collapse; margin: 1rem 0 1.5rem; font-size: 0.9rem; }
        .doc-table th {
          text-align: left; padding: 0.6rem 0.75rem; color: var(--rp-text-dim);
          font-size: 0.75rem; letter-spacing: 0.05em; border-bottom: 1px solid var(--rp-glass-border);
        }
        .doc-table td {
          padding: 0.6rem 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.04);
          color: var(--rp-text-muted); vertical-align: top;
        }
        .doc-table code { color: var(--rp-accent); font-size: 0.85rem; }
        .doc-callout {
          border-radius: 10px; padding: 1rem 1.15rem; margin: 1.5rem 0;
          line-height: 1.7; font-size: 0.93rem;
        }
        .doc-callout-warn { background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.3); color: #fde68a; }
        .doc-callout-info { background: rgba(56,189,248,0.07); border: 1px solid rgba(56,189,248,0.3); color: #bae6fd; }
        /* Scoped past .doc-body a, which has the same specificity and is
           declared first — without this the label is accent-on-accent and the
           button reads as an empty block. */
        .doc-body a.doc-cta {
          display: inline-block; padding: 0.7rem 1.3rem; border-radius: 9px;
          background: var(--rp-accent); color: #04121c; font-weight: 700;
          text-decoration: none; margin-top: 0.5rem;
        }
        .doc-body a.doc-cta:hover { background: #7dd3fc; }
        @media (max-width: 860px) {
          .doc-shell { grid-template-columns: 1fr; gap: 1.5rem; padding: 1.75rem 1rem 4rem; }
          .doc-nav { position: static; display: flex; flex-wrap: wrap; gap: 0.25rem; }
          .doc-nav a { border-left: 0; padding: 0.3rem 0.6rem; background: var(--rp-glass); border-radius: 999px; font-size: 0.82rem; }
          .doc-h1 { font-size: 1.7rem; }
        }
      `}</style>

      <div className="doc-page">
        <Navbar />
        <div className="doc-shell">
          <nav className="doc-nav" aria-label="On this page">
            {SECTIONS.map((s) => (
              <a href={`#${s.id}`} key={s.id}>
                {s.label}
              </a>
            ))}
          </nav>

          <main className="doc-body">
            <h1 className="doc-h1">Developer API</h1>
            <p className="doc-lede">
              Push live game activity into Lines Police CAD and read the CAD back out. Your players
              create characters, vehicles and licenses inside your server, and later find all of it
              on our website and in our app. Built for FiveM first.
            </p>
            <a className="doc-cta" href="/developer">
              Get a key
            </a>

            <h2 className="doc-h2" id="start">
              Getting started
            </h2>
            <p>
              Keys are scoped to one community, and you pick exactly what each one may do. Base URL
              and auth:
            </p>
            <Code lang="HTTP">{`https://api.linespolice-cad.com/api/v1/dev
Authorization: Bearer lpc_live_...`}</Code>
            <div className="doc-callout doc-callout-warn">
              Send the key in <code>Authorization</code>, not <code>X-API-Key</code>. That header is
              our own internal secret and your key will never satisfy it.
            </div>
            <p>
              You see a key once, when you create it. We store only a hash, so if you lose it you
              rotate it rather than recovering it. Start every debugging session with{' '}
              <code>GET /whoami</code>: it needs no scopes, so it works even when the thing you are
              debugging is a missing one.
            </p>

            <h2 className="doc-h2" id="quickstart">
              Quickstart
            </h2>

            <h3 className="doc-h3">1. Create a community</h3>
            <p>
              Owned by your LPC account and counted against your plan, exactly like one made on the
              website. It starts private.
            </p>
            <Code lang="SHELL">{`curl -X POST https://api.linespolice-cad.com/api/v1/dev/communities \\
  -H "Authorization: Bearer $LPC_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Grapeseed RP"}'`}</Code>
            <p>
              Already have a community? Skip this and ask its owner to approve your key from{' '}
              <strong>Community settings → API keys</strong>.
            </p>

            <h3 className="doc-h3">2. Upsert a player</h3>
            <p>
              You name players by their <strong>game identifier</strong> — a FiveM license or a
              Discord ID. Never by email, and never by an LPC user id.
            </p>
            <Code lang="SHELL">{`curl -X POST .../dev/players \\
  -H "Authorization: Bearer $LPC_KEY" \\
  -d '{"provider":"fivem","identifier":"license:1a2b3c4d","username":"Dave"}'`}</Code>
            <p>
              <strong>This is idempotent.</strong> Call it on every connect. The same identifier
              always returns the same account, even if two of your servers call at the same instant.
            </p>
            <div className="doc-callout doc-callout-info">
              The account we create <strong>cannot be logged into</strong>. It holds no email and no
              password, and that is deliberate: an email you send us would be an email you control,
              so taking one would hand you a way into your players&apos; accounts. The player takes
              ownership themselves in step 4.
            </div>

            <h3 className="doc-h3">3. Create their character</h3>
            <Code lang="SHELL">{`curl -X POST .../dev/communities/$COMMUNITY/civilians \\
  -H "Authorization: Bearer $LPC_KEY" \\
  -d '{
    "player": "fivem:1a2b3c4d",
    "firstName": "John", "lastName": "Smith",
    "birthday": "1998-04-10", "address": "Grapeseed Farmhouse"
  }'`}</Code>
            <p>
              Vehicles, firearms and licenses hang off that character by <code>civilianId</code>. If
              the response says <code>pendingApproval</code>, the community vets its characters and
              a person has to approve it — your key does not skip that, and nor does it skip the
              community&apos;s per-player character cap.
            </p>

            <h3 className="doc-h3">4. Show the player their claim code</h3>
            <Code lang="SHELL">{`curl -X POST .../dev/players/fivem/1a2b3c4d/claim-code \\
  -H "Authorization: Bearer $LPC_KEY"

{ "code": "K7M2-QX9P-4T", "url": "https://www.linespolice-cad.com/developer/claim" }`}</Code>
            <p>
              Show both in game. The player opens the URL, signs in or signs up, enters the code,
              and everything you made for them is on their account. Codes last 30 minutes, work
              once, and asking for a new one kills the old one. A player who has linked Discord to
              LPC, and whom you provisioned by Discord ID, can claim with no code at all.
            </p>

            <h2 className="doc-h2" id="fivem">
              A working FiveM resource
            </h2>
            <p>Server side. Covers connect, the claim code, and a chunked status tick.</p>
            <Code lang="LUA">{FIVEM_LUA}</Code>
            <Code lang="SERVER.CFG">{`set lpc_api_key "lpc_live_your_key_here"
set lpc_community_id "your_community_id"`}</Code>
            <div className="doc-callout doc-callout-warn">
              Use <code>set</code>, not <code>setr</code>. A <code>setr</code> convar is replicated
              to every connected client, which would hand your key to anyone who joins.
            </div>

            <h2 className="doc-h2" id="limits">
              Rate limits
            </h2>
            <table className="doc-table">
              <thead>
                <tr>
                  <th>PLAN</th>
                  <th>BURST</th>
                  <th>DAILY</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Free</td>
                  <td>60 / minute</td>
                  <td>10,000 / day</td>
                </tr>
                <tr>
                  <td>Pro</td>
                  <td>600 / minute</td>
                  <td>250,000 / day</td>
                </tr>
              </tbody>
            </table>
            <p>
              Every response carries <code>X-RateLimit-Limit</code>,{' '}
              <code>X-RateLimit-Remaining</code>, <code>X-RateLimit-Reset</code> and{' '}
              <code>X-RateLimit-Scope</code>. A 429 adds <code>Retry-After</code> and a body saying
              which limit you hit.
            </p>
            <div className="doc-callout doc-callout-warn">
              <strong>Do not loop over your players.</strong> A server ticking once a second with 64
              players is 3,840 requests a minute, over even the paid limit. Send one{' '}
              <strong>bulk</strong> status call per tick instead: up to 100 units, which is 60
              requests a minute for a full server. It is partial, so one unknown player does not
              discard the other sixty-three.
            </div>
            <p>
              There are separate, lower daily caps on creating player accounts and communities,
              because those make rows that are awkward to undo. Free is 25 accounts and 2
              communities a day. Both reset at midnight UTC, and hitting the account cap does not
              stop you looking up players you already know.
            </p>

            <h2 className="doc-h2" id="scopes">
              Scopes
            </h2>
            <p>Pick the narrowest set that does the job. A scope you did not pick is a 403 that names it.</p>
            <table className="doc-table">
              <thead>
                <tr>
                  <th>SCOPE</th>
                  <th>GRANTS</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['community:read', "The community's profile, departments and ten-codes"],
                  ['units:read / units:write', 'Who is on duty; set status, ten-code and location'],
                  ['calls:read / calls:write', 'Calls; create, update and close'],
                  ['bolos:read / bolos:write', 'BOLOs'],
                  ['civilians:read / civilians:write', 'Look up by name; create for linked players'],
                  ['vehicles:read / vehicles:write', 'Look up by plate; register'],
                  ['firearms:read / firearms:write', 'Look up by serial; register'],
                  ['licenses:write', 'Issue licenses'],
                  ['players:provision', 'Create and link player accounts, issue claim codes'],
                  ['communities:provision', 'Create communities owned by you'],
                  ['members:read / members:write', 'The roster; invite, approve, promote, remove'],
                ].map(([scope, grants]) => (
                  <tr key={scope}>
                    <td>
                      <code>{scope}</code>
                    </td>
                    <td>{grants}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              Every membership write names an <strong>acting player</strong>, and we check that
              player&apos;s permissions the same way the website would. A key never grants more than
              the player it acts for.
            </p>

            <h2 className="doc-h2" id="errors">
              Errors
            </h2>
            <p>
              Every error has a stable <code>error</code> code to branch on and a message written
              for a person to read.
            </p>
            <table className="doc-table">
              <thead>
                <tr>
                  <th>CODE</th>
                  <th>WHAT TO DO</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['invalid_key', 'Wrong, revoked, or sent in the wrong header'],
                  ['missing_scope', 'The response names the scope; add it to the key'],
                  ['community_not_granted', 'The key is not approved for that community'],
                  ['community_pending_deletion', 'The owner deleted it; read-only for 30 days'],
                  ['acting_player_lacks_permission', 'That player cannot do it, so neither can your key'],
                  ['player_not_found', 'Upsert the player first'],
                  ['already_claimed', 'The player owns their account; they sign in normally'],
                  ['ten_code_not_found', 'Read ids from /ten-codes rather than hardcoding'],
                  ['rate_limited', 'Honour Retry-After'],
                  ['provision_cap_reached', 'Daily account or community cap; resets at midnight UTC'],
                ].map(([code, what]) => (
                  <tr key={code}>
                    <td>
                      <code>{code}</code>
                    </td>
                    <td>{what}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h2 className="doc-h2" id="never">
              What a key cannot do
            </h2>
            <p>
              Not a matter of picking scopes. These are not on the developer surface at all, so no
              key can reach them:
            </p>
            <ul>
              <li>change a password, an email, or anything else on a claimed account</li>
              <li>touch money: wallets, balances, transfers, economy payouts</li>
              <li>billing, subscriptions or boosts</li>
              <li>community settings, roles, permissions or deletion</li>
              <li>assign a role to a member — roles carry permissions; departments and ranks are fine</li>
              <li>read any community your key is not tied to</li>
            </ul>
            <p>
              A community owner can withdraw your key&apos;s access at any time from their own
              settings, and it stops working on your next request.
            </p>

            <h2 className="doc-h2" id="help">
              Getting help
            </h2>
            <p>
              Open a ticket in <a href="https://discord.gg/Y9ytW2ZMp4">our Discord</a>. Include your
              key&apos;s display prefix (<code>lpc_live_a1b2c3d4</code>) — never the key itself —
              and the <code>error</code> code you got.
            </p>
            <a className="doc-cta" href="/developer">
              Get a key
            </a>
          </main>
        </div>
        <Footer />
      </div>
    </>
  );
}
