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
import { DEVELOPER_API_BASE_URL } from '@/lib/developer-api-public';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const SECTIONS = [
  { id: 'start', label: 'Getting started' },
  { id: 'quickstart', label: 'Quickstart' },
  { id: 'fivem', label: 'FiveM example' },
  { id: 'limits', label: 'Rate limits' },
  { id: 'scopes', label: 'Scopes' },
  { id: 'reports', label: 'Report drafts' },
  { id: 'warrants', label: 'Warrants' },
  { id: 'npcs', label: 'Simulated characters' },
  { id: 'changes', label: 'Polling cheaply' },
  { id: 'webhooks', label: 'Webhooks' },
  { id: 'attachments', label: 'Attachments' },
  { id: 'activity', label: 'Debugging' },
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
local LPC_BASE      = "${DEVELOPER_API_BASE_URL}/api/v1/dev"
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
           declared first, without this the label is accent-on-accent and the
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
            <Code lang="HTTP">{`${DEVELOPER_API_BASE_URL}/api/v1/dev
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
            <Code lang="SHELL">{`curl -X POST ${DEVELOPER_API_BASE_URL}/api/v1/dev/communities \\
  -H "Authorization: Bearer $LPC_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Grapeseed RP"}'`}</Code>
            <p>
              Already have a community? Skip this and ask its owner to approve your key from{' '}
              <strong>Community settings → API keys</strong>.
            </p>

            <h3 className="doc-h3">2. Upsert a player</h3>
            <p>
              You name players by their <strong>game identifier</strong>: a FiveM license or a
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
              a person has to approve it, your key does not skip that, and nor does it skip the
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
                  [
                    'reports:read / reports:write',
                    'Read back your own drafts; prepare new ones. Neither files a report',
                  ],
                  [
                    'warrants:read / warrants:write',
                    "Read the community's warrants; ask for one. Asking never issues one",
                  ],
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

            <h2 className="doc-h2" id="reports">
              Report drafts
            </h2>
            <p>
              <code>POST /communities/{'{communityId}'}/reports/drafts</code> writes a draft
              incident, arrest or citation report from what your server saw.{' '}
              <strong>It does not file a report.</strong> There is no endpoint here that does: a
              person with the community&apos;s <code>manage records</code> permission reads the
              draft on the website and files it there.
            </p>
            <p>
              That is deliberate. An arrest report in a community carries jail time, a fine and a
              court case. Your server can see a scuffle; it cannot know whether that was an arrest.
              So treat a <code>201</code> as &ldquo;the draft is in the queue&rdquo;, never as
              &ldquo;the report exists&rdquo;, and poll{' '}
              <code>GET …/reports/drafts/{'{externalId}'}</code> to find out what they decided.
            </p>
            <ul>
              <li>
                <strong>Idempotent</strong> on your own <code>externalId</code>, like a dispatch
                call. A retry updates the draft rather than adding a second one to somebody&apos;s
                queue. Once a person has filed or rejected it you get a{' '}
                <code>409 draft_already_reviewed</code> and their decision is left alone.
              </li>
              <li>
                <strong>Facts stay apart from the narrative.</strong> <code>facts</code> is what you
                observed; <code>narrative</code> is prose about it. A narrative with no{' '}
                <code>generated</code> field is <strong>recorded as generated</strong>: send{' '}
                <code>&quot;generated&quot;: false</code> only when a person typed the text. There
                is no way to mark a narrative as evidence, and there will not be.
              </li>
              <li>
                <strong>You name charges; the community prices them.</strong> Send the violation
                names from the community&apos;s own penal code and we fill in the fine and the jail
                time from it. A name they do not have is refused, so you cannot invent an amount.
              </li>
              <li>
                <strong><code>reportingOfficer</code> is what gets checked.</strong> Your scope
                decides whether you may propose a draft at all; whether this draft is allowed is
                decided by that player&apos;s access, an approved member who is in a department.
                Name a <code>templateSlug</code> and the community&apos;s own form gates apply to
                them too.
              </li>
            </ul>

            <h2 className="doc-h2" id="warrants">
              Warrants
            </h2>
            <p>
              Read them with <code>GET /communities/{'{communityId}'}/warrants</code>, filterable by{' '}
              <code>accused</code> and <code>status</code>, so &ldquo;is there a warrant out for
              this person?&rdquo; is one request. <code>approved</code> and{' '}
              <code>awaitingReview</code> are spelled out on each one so you do not have to decide
              whether <code>executed</code> counts.
            </p>
            <p>
              <code>POST …/warrants/requests</code> asks for one, and{' '}
              <strong>a request always lands pending</strong>: whatever the community&apos;s
              approval mode says.
            </p>
            <p>
              That is deliberately not what the website does. A community can set auto-approve, and
              most have, so an officer clicking the button in the CAD gets an approved warrant at
              once. That is a convenience for a person who is already in the CAD and can see the
              result. A game server fires on a trigger, retries, and nobody is watching, so a key
              gets the pending queue the community already has, a person reviews it with the tools
              they already use, and you read the outcome back. <code>judgeNotes</code> comes back on
              a denial, which is the only thing that explains one to your officer.
            </p>

            <h2 className="doc-h2" id="npcs">
              Simulated characters
            </h2>
            <p>
              Mark an NPC once, when you provision it:{' '}
              <code>{'{"provider":"fivem","identifier":"…","synthetic":true}'}</code>. Everything
              that character owns inherits the mark, so you do not have to repeat it on each
              civilian, vehicle and firearm.
            </p>
            <p>
              Synthetic records are left out of the searches and rosters players see, including the
              website&apos;s own name database, unless a caller passes{' '}
              <code>includeSynthetic=true</code>. So you can populate a city without burying the
              twelve real players behind four hundred NPCs.
            </p>
            <p>
              They count against your key&apos;s daily provisioning cap, so a runaway loop is still
              bounded. They do not count against a player&apos;s own per-community character cap: an
              NPC is nobody&apos;s character, and counting it both ways would mean your scenery
              consuming your players&apos; allowances.
            </p>
            <p>
              When a test run is done, clean up with{' '}
              <code>DELETE /communities/{'{communityId}'}/synthetic-records</code>. It only ever
              touches synthetic records your own key created, in the community in the path, and{' '}
              <code>confirm</code> has to be that community id, so a cleanup aimed at your test
              community cannot run against a live one because a config value was stale. A community
              owner can also remove everything your key made, from their own settings; that path
              exists for an integration that has stopped answering, so it does not need your
              cooperation.
            </p>

            <h2 className="doc-h2" id="changes">
              Polling cheaply
            </h2>
            <p>
              <code>GET /communities/{'{communityId}'}/changes?since=&lt;cursor&gt;</code> returns
              only what has changed. Without it, finding out whether a call was closed means
              re-reading every call, on a busy community that is a scan per tick, and it is why
              polling has a reputation for being expensive.
            </p>
            <p>
              <strong>Call it with no <code>since</code> first.</strong> You get no events and a
              cursor pointing at now, because replaying a week of history to a client that is about
              to read current state anyway is not a service. Then poll with that cursor; each
              response hands you the next one, also in <code>X-LPC-Cursor</code> so a Lua callback
              need not parse the body.
            </p>
            <p>
              <strong>Pass <code>excludeSelf=true</code></strong> unless you want your own writes
              back. Close a call, receive your own <code>call.closed</code>, close it again: that is
              the loop this parameter exists to prevent.
            </p>
            <p>
              The website&apos;s own handlers emit too, so a call a dispatcher closed in the CAD
              reaches you like one you closed yourself. Events are named after what happened in the
              product rather than after the endpoint that caused it:
            </p>
            <table className="doc-table">
              <thead>
                <tr>
                  <th>EVENT</th>
                  <th>WHEN</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['call.created / call.updated / call.closed', 'A call appeared, changed, or ended'],
                  ['call.assigned', 'The units on a call changed, separate, so you need not diff every update'],
                  ['unit.status_changed', "One unit's ten-code, location or department changed"],
                  ['record.created', 'A civilian, vehicle, firearm or licence was created'],
                  ['report_draft.filed / report_draft.rejected', 'A person acted on a draft you wrote'],
                  ['warrant.requested / warrant.reviewed', 'A warrant was asked for, or decided'],
                ].map(([event, when]) => (
                  <tr key={event}>
                    <td>
                      <code>{event}</code>
                    </td>
                    <td>{when}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              Events are kept <strong>7 days</strong>, shorter than the activity feed on purpose. A
              cursor staler than that means you should re-read current state rather than replay a
              week, so persist it somewhere that survives a restart and treat a long outage as a
              resync. <code>hasMore</code> tells you to call again; there is no total, because you
              cannot act on one.
            </p>

            <h2 className="doc-h2" id="webhooks">
              Webhooks
            </h2>
            <p>
              Register an endpoint per key in{' '}
              <a href="/developer">the console</a>. You get a signing secret once, and deliveries
              carry the <strong>same event shape</strong> the cursor endpoint returns, so moving
              from polling to webhooks does not mean rewriting your handler, and you can run both
              while you migrate because the event id is stable and the duplicate is recognisable.
            </p>
            <p>
              <strong>Verify every delivery.</strong> Recompute{' '}
              <code>HMAC-SHA256(secret, &quot;&lt;t&gt;.&quot; + rawBody)</code> and compare in
              constant time against the <code>v1</code> value in <code>X-LPC-Signature</code>, then
              reject anything whose <code>t</code> is more than <strong>300 seconds</strong> old.
              That last step is what stops a captured delivery being replayable; the signature alone
              proves nothing about when the request was made.
            </p>
            <p>
              Use the <strong>raw body</strong>, before any JSON parsing. A re-serialised body will
              not match, and that is the single most common reason a first webhook integration
              rejects everything.
            </p>
            <table className="doc-table">
              <thead>
                <tr>
                  <th>HEADER</th>
                  <th>WHAT IT IS</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['X-LPC-Signature', 't=<unix>,v1=<hex>, verify as above'],
                  ['X-LPC-Event-Id', 'Stable across retries, so you can recognise a duplicate'],
                  ['X-LPC-Event-Type', 'The same type as in the body'],
                  ['X-LPC-Delivery-Id', 'This attempt'],
                  ['X-LPC-Attempt', 'Which attempt this is'],
                ].map(([header, what]) => (
                  <tr key={header}>
                    <td>
                      <code>{header}</code>
                    </td>
                    <td>{what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              <strong>Answer <code>2xx</code> quickly and do your work afterwards.</strong> You have
              10 seconds. A non-2xx is retried after 10s, 30s, 2m, 5m and 15m; an endpoint that
              fails 20 deliveries in a row is switched off, with the reason in the console.
            </p>
            <p>
              <strong>Nothing is lost when a delivery fails.</strong> The event is still readable
              from the cursor endpoint for its 7 days, which is why webhooks are a transport over
              the event log rather than a second source of truth.
            </p>
            <p>A few rules on the endpoint itself, so there are no surprises when you save it:</p>
            <ul>
              <li>
                <strong>https only.</strong> An http endpoint would ship the signature and the body
                in clear
              </li>
              <li>
                <strong>A public host.</strong> We refuse loopback, private ranges, link-local and
                the cloud metadata address, checked again immediately before every request
              </li>
              <li>
                <strong>No redirects.</strong> We will not follow one. If your URL needs to change,
                change it in the console
              </li>
              <li>
                <strong>No credentials in the URL.</strong> The signature is how you authenticate us
              </li>
            </ul>
            <p>
              Rotating the secret keeps the endpoint and its subscription, so it is not an outage,
              but the next delivery is signed with the new secret, so update your receiver first.
            </p>

            <h2 className="doc-h2" id="attachments">
              Attachments
            </h2>
            <p>
              <code>POST …/reports/drafts/{'{externalId}'}/attachments</code> and{' '}
              <code>POST …/dispatch/calls/{'{externalId}'}/attachments</code> record{' '}
              <strong>metadata and a link</strong>. We host no bytes, there is no upload endpoint,
              and we never fetch the URL, it is a link a person clicks in their own browser.
            </p>
            <p>
              That is the answer rather than a first step. Accepting third-party binaries would mean
              scanning them, storing them, quotas, a takedown path and a legal position on content
              we host, and none of that is needed for a reviewer clicking through to the clip your
              server already recorded.
            </p>
            <p>
              <strong><code>kind</code> is never <code>evidence</code>.</strong> A link you supply
              points at something we have not seen, on a server we do not control; calling it
              evidence inside a system that produces jail time would give it a standing it has not
              earned. Use <code>clip</code>, <code>screenshot</code>, <code>log</code>,{' '}
              <code>document</code> or <code>other</code>, and let a person decide what it is. The
              same applies to a generated narrative.
            </p>
            <p>
              Limits: 10 per record, a 1024-character http or https URL with no credentials in it,
              and a bounded declared size. Idempotent on the URL, so a retry does not give a
              reviewer two of the same thing. Nothing can be attached once a person has reviewed the
              draft. Every attach and detach is audited.
            </p>

            <h2 className="doc-h2" id="activity">
              When something is not working
            </h2>
            <p>
              Every response carries <code>X-Request-Id</code>. Send <code>X-Correlation-Id</code>{' '}
              with your own id and we echo it back and record it beside ours, so your logs line up
              with ours.
            </p>
            <p>
              <code>GET /activity</code> is this key&apos;s own request history, and it{' '}
              <strong>needs no scope</strong>: a key that is being refused has to be able to find
              out why, and gating the diagnostic would withhold it from exactly the keys that need
              it. Each row says which route, which community, what we answered, and on a{' '}
              <code>missing_scope</code> refusal <strong>which scope was missing</strong>, which is
              the thing a bare 403 in your own logs does not tell you.
            </p>
            <p>
              Rows are kept <strong>30 days</strong>. They hold no request body, no response body
              and no header values, only the shape of each exchange, so if you need the contents of
              a call you made, log it your end. Quote a request id in a{' '}
              <a href="https://discord.gg/Y9ytW2ZMp4">ticket</a> and we can find exactly that
              request.
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
                  ['charge_not_in_penal_code', "Read the community's penal code and send the names it lists"],
                  ['reporting_officer_has_no_department', 'Put the officer in a department first'],
                  ['template_not_permitted', "The community's form gates exclude that officer"],
                  ['draft_already_reviewed', 'A person has acted on it; write a new draft with a new externalId'],
                  ['confirm_required', 'A cleanup needs confirm set to the community id'],
                  ['invalid_cursor', 'since must be a cursor from a previous response'],
                  ['invalid_event_type', 'Read the event list rather than guessing at it'],
                  ['invalid_attachment', 'Unknown kind, no url, credentials in the url, or kind: "evidence", which does not exist'],
                  ['attachment_limit_reached', '10 per record'],
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
              <li>assign a role to a member, roles carry permissions; departments and ranks are fine</li>
              <li>read any community your key is not tied to</li>
              <li>
                <strong>file a report.</strong> A draft is a proposal; the verb that turns one into
                an arrest, citation or incident record is on the website, behind the
                community&apos;s own permission. There is no <code>reports:file</code> scope and
                there will not be one
              </li>
              <li>
                <strong>issue a warrant.</strong> A request lands pending for the community&apos;s
                own reviewer, whatever its approval mode says
              </li>
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
              key&apos;s display prefix (<code>lpc_live_a1b2c3d4</code>), never the key itself,
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
