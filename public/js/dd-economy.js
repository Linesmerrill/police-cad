// dd-economy.js — smart on-the-clock / clock-in card for department-dashboard.
//
// Behavior:
//   - Looks up the user's active civilian for this community.
//   - Polls the active clock-in session for that civilian.
//   - If on the clock for THIS department: renders a live card with
//     elapsed time, estimated earned, and a Clock-out button.
//   - If on the clock for a DIFFERENT department: renders a small notice
//     with a Clock-out button so the user can free themselves up before
//     clocking in here.
//   - If not on the clock AND this department has economy enabled AND
//     the user is a member (or the department is public): renders a
//     passive Clock-in card.
//   - Otherwise renders nothing (slot stays empty).
//
// All money is in cents end-to-end.

(function () {
  'use strict';

  const SLOT_ID = 'dd-economy-slot';
  const PILL_ID = 'dd-economy-pill';

  function getCfg() {
    return window.ddConfig || null;
  }

  function fmtMoney(cents) {
    const sign = cents < 0 ? '-' : '';
    const abs = Math.abs(cents || 0);
    const dollars = Math.floor(abs / 100);
    const rem = abs % 100;
    return sign + '$' + dollars.toLocaleString() + '.' + String(rem).padStart(2, '0');
  }

  function fmtElapsed(seconds) {
    seconds = Math.max(0, Math.floor(seconds));
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  function ensureStyles() {
    if (document.getElementById('dd-economy-styles')) return;
    const style = document.createElement('style');
    style.id = 'dd-economy-styles';
    style.textContent = `
      .dd-econ-wrap { margin: 0 0 1.25rem; }
      .dd-econ-card {
        position: relative;
        border-radius: 14px;
        padding: 1rem 1.1rem;
        background: var(--dd-glass, rgba(255,255,255,0.04));
        border: 1px solid var(--dd-glass-border, rgba(255,255,255,0.06));
        display: flex; align-items: center; gap: 1rem;
        overflow: hidden;
      }
      .dd-econ-card.is-active {
        background: linear-gradient(135deg, rgba(34,197,94,0.10), rgba(56,189,248,0.06));
        border-color: rgba(34,197,94,0.32);
      }
      .dd-econ-card.is-other {
        background: linear-gradient(135deg, rgba(251,191,36,0.07), rgba(255,255,255,0.02));
        border-color: rgba(251,191,36,0.28);
      }
      .dd-econ-icon {
        width: 44px; height: 44px; border-radius: 11px;
        display: flex; align-items: center; justify-content: center;
        background: rgba(255,255,255,0.05); color: var(--dd-text-muted, #94a3b8);
        font-size: 1.05rem; flex-shrink: 0;
      }
      .dd-econ-card.is-active .dd-econ-icon {
        background: rgba(34,197,94,0.18); color: #22c55e;
      }
      .dd-econ-card.is-active .dd-econ-icon::after {
        content: ''; position: absolute; inset: 0;
        border-radius: inherit;
        box-shadow: 0 0 0 0 rgba(34,197,94,0.45);
        animation: ddEconPulse 2.4s infinite;
      }
      @keyframes ddEconPulse {
        0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.35); }
        70%  { box-shadow: 0 0 0 16px rgba(34,197,94,0); }
        100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
      }
      .dd-econ-card.is-other .dd-econ-icon { background: rgba(251,191,36,0.18); color: #fbbf24; }
      .dd-econ-body { flex: 1; min-width: 0; }
      .dd-econ-title {
        display: flex; align-items: center; gap: 0.5rem;
        font-size: 0.95rem; font-weight: 600; color: var(--dd-text, #e2e8f0);
      }
      .dd-econ-sub { font-size: 0.78rem; color: var(--dd-text-muted, #94a3b8); margin-top: 0.2rem; }
      .dd-econ-metrics {
        display: flex; gap: 1.5rem; margin-top: 0.55rem;
        font-variant-numeric: tabular-nums;
      }
      .dd-econ-metric-label {
        font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.08em;
        color: var(--dd-text-muted, #94a3b8);
      }
      .dd-econ-metric-value {
        font-size: 1.05rem; font-weight: 600; color: var(--dd-text, #e2e8f0);
      }
      .dd-econ-card.is-active .dd-econ-metric-value.is-earned { color: #22c55e; }
      .dd-econ-actions { display: flex; align-items: center; gap: 0.55rem; flex-shrink: 0; }
      .dd-econ-btn {
        display: inline-flex; align-items: center; gap: 0.4rem;
        padding: 0.5rem 0.9rem;
        font-size: 0.82rem; font-weight: 500;
        border-radius: 8px; cursor: pointer; border: 1px solid transparent;
        font-family: inherit;
        transition: background 120ms, border-color 120ms, transform 120ms;
      }
      .dd-econ-btn-primary {
        background: rgba(56,189,248,0.12); color: #38bdf8;
        border-color: rgba(56,189,248,0.28);
      }
      .dd-econ-btn-primary:hover:not(:disabled) { background: rgba(56,189,248,0.22); }
      .dd-econ-btn-danger {
        background: rgba(239,68,68,0.12); color: #ef4444;
        border-color: rgba(239,68,68,0.28);
      }
      .dd-econ-btn-danger:hover:not(:disabled) { background: rgba(239,68,68,0.22); }
      .dd-econ-btn-ghost {
        background: transparent; color: var(--dd-text-muted, #94a3b8);
        border-color: var(--dd-glass-border, rgba(255,255,255,0.06));
      }
      .dd-econ-btn-ghost:hover:not(:disabled) { color: var(--dd-text, #e2e8f0); border-color: rgba(255,255,255,0.15); }
      .dd-econ-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      @media (max-width: 640px) {
        .dd-econ-card { flex-wrap: wrap; }
        .dd-econ-actions { width: 100%; justify-content: flex-end; margin-top: 0.4rem; }
      }

      /* ---------- Compact sidebar pill (command/judicial) ---------- */
      .dd-econ-pill {
        position: relative;
        margin: 0.5rem 0.75rem 0.75rem;
        padding: 0.7rem 0.75rem;
        border-radius: 10px;
        background: linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.01));
        border: 1px solid rgba(255,255,255,0.06);
        overflow: hidden;
        font-family: inherit;
      }
      .dd-econ-pill[data-state="active"] {
        background:
          radial-gradient(120% 80% at 0% 0%, rgba(34,197,94,0.10), transparent 60%),
          linear-gradient(180deg, rgba(34,197,94,0.05), rgba(34,197,94,0.015));
        border-color: rgba(34,197,94,0.30);
        box-shadow: inset 0 0 0 1px rgba(34,197,94,0.06), 0 0 24px -8px rgba(34,197,94,0.35);
      }
      .dd-econ-pill[data-state="other"] {
        background: linear-gradient(180deg, rgba(251,191,36,0.06), rgba(251,191,36,0.015));
        border-color: rgba(251,191,36,0.32);
      }
      .dd-econ-pill-head {
        display: flex; align-items: center; gap: 0.45rem;
        font-size: 0.68rem; font-weight: 600;
        letter-spacing: 0.12em; text-transform: uppercase;
        color: var(--cd-text-muted, #94a3b8);
      }
      .dd-econ-pill[data-state="active"] .dd-econ-pill-head { color: #4ade80; }
      .dd-econ-pill[data-state="other"]  .dd-econ-pill-head { color: #fbbf24; }
      .dd-econ-pill-dot {
        width: 7px; height: 7px; border-radius: 50%;
        background: var(--cd-text-dim, #64748b);
        flex-shrink: 0;
      }
      .dd-econ-pill[data-state="active"] .dd-econ-pill-dot {
        background: #22c55e;
        box-shadow: 0 0 0 0 rgba(34,197,94,0.6);
        animation: ddEconPillPulse 1.8s ease-out infinite;
      }
      @keyframes ddEconPillPulse {
        0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.55); }
        70%  { box-shadow: 0 0 0 7px rgba(34,197,94,0); }
        100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
      }
      .dd-econ-pill-dept {
        margin-top: 0.25rem;
        font-size: 0.78rem; color: var(--cd-text, #e2e8f0);
        font-weight: 500;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .dd-econ-pill-readout {
        display: flex; align-items: baseline; gap: 0.55rem;
        margin-top: 0.4rem;
      }
      .dd-econ-pill-time {
        font-family: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace;
        font-size: 1.05rem; font-weight: 600;
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.02em;
        color: var(--cd-text, #e2e8f0);
      }
      .dd-econ-pill[data-state="active"] .dd-econ-pill-time { color: #d1fae5; }
      /* Blink the colons on tick so the timer feels alive */
      .dd-econ-pill[data-state="active"] .dd-econ-pill-time .sep {
        animation: ddEconSep 1s steps(2, start) infinite;
      }
      @keyframes ddEconSep { 50% { opacity: 0.32; } }
      .dd-econ-pill-earned {
        font-size: 0.74rem; font-weight: 500;
        font-variant-numeric: tabular-nums;
        color: #22c55e;
        margin-left: auto;
      }
      .dd-econ-pill-actions {
        display: flex; gap: 0.35rem;
        margin-top: 0.55rem;
      }
      .dd-econ-pill-btn {
        flex: 1;
        display: inline-flex; align-items: center; justify-content: center; gap: 0.35rem;
        padding: 0.4rem 0.55rem;
        font-size: 0.72rem; font-weight: 500;
        border-radius: 7px; cursor: pointer; border: 1px solid transparent;
        font-family: inherit;
        transition: background 120ms, color 120ms, border-color 120ms;
      }
      .dd-econ-pill-btn.danger {
        background: rgba(239,68,68,0.10); color: #f87171;
        border-color: rgba(239,68,68,0.22);
      }
      .dd-econ-pill-btn.danger:hover:not(:disabled) { background: rgba(239,68,68,0.20); color: #fca5a5; }
      .dd-econ-pill-btn.primary {
        background: rgba(56,189,248,0.10); color: #38bdf8;
        border-color: rgba(56,189,248,0.24);
      }
      .dd-econ-pill-btn.primary:hover:not(:disabled) { background: rgba(56,189,248,0.20); }
      .dd-econ-pill-btn.ghost {
        background: transparent; color: var(--cd-text-muted, #94a3b8);
        border-color: rgba(255,255,255,0.08);
      }
      .dd-econ-pill-btn.ghost:hover:not(:disabled) { color: var(--cd-text, #e2e8f0); border-color: rgba(255,255,255,0.18); }
      .dd-econ-pill-btn:disabled { opacity: 0.55; cursor: not-allowed; }
      .dd-econ-pill-idle-sub {
        margin-top: 0.3rem;
        font-size: 0.7rem; color: var(--cd-text-muted, #94a3b8);
      }
      .dd-econ-pill-idle-sub b {
        color: var(--cd-text, #e2e8f0); font-weight: 600;
        font-variant-numeric: tabular-nums;
      }
    `;
    document.head.appendChild(style);
  }

  // ---------- API helpers ----------

  async function fetchActiveCivilianId(cfg) {
    if (!cfg.userId || !cfg.communityId) return '';
    try {
      const res = await fetch(`${cfg.API_URL}/api/v1/civilians/user/${encodeURIComponent(cfg.userId)}?active_community_id=${encodeURIComponent(cfg.communityId)}`);
      if (!res.ok) return '';
      const civs = await res.json();
      if (!Array.isArray(civs) || !civs.length) return '';
      // Pick the most-recently-updated as the "active" civilian. Mirrors the
      // server-side resolveEconomyContext logic used by /wallet.
      civs.sort((a, b) => {
        const au = new Date(a?.civilian?.updatedAt || 0).getTime();
        const bu = new Date(b?.civilian?.updatedAt || 0).getTime();
        return bu - au;
      });
      return civs[0]._id || '';
    } catch (err) {
      console.warn('[dd-economy] civ resolve failed', err);
      return '';
    }
  }

  async function fetchActiveSession(cfg, civId) {
    if (!civId) return null;
    try {
      const res = await fetch(`${cfg.API_URL}/api/v2/economy/session/active?civilianId=${encodeURIComponent(civId)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data && data._id ? data : null;
    } catch (err) {
      console.warn('[dd-economy] session fetch failed', err);
      return null;
    }
  }

  async function fetchCommunityEcon(cfg) {
    if (!cfg.communityId) return { economyEnabled: false, dept: null, tenCodes: [] };
    try {
      const res = await fetch(`${cfg.API_URL}/api/v1/community/${encodeURIComponent(cfg.communityId)}`);
      if (!res.ok) return { economyEnabled: false, dept: null, tenCodes: [] };
      const data = await res.json();
      const community = data.community || {};
      const econ = community.economy || {};
      const depts = community.departments || [];
      const dept = depts.find(d => d._id === cfg.departmentId) || null;
      return {
        economyEnabled: !!econ.enabled,
        dept: dept,
        tenCodes: community.tenCodes || [],
      };
    } catch (err) {
      console.warn('[dd-economy] community fetch failed', err);
      return { economyEnabled: false, dept: null, tenCodes: [] };
    }
  }

  // Pull the numeric suffix from "10-41", "signal 41", "S-41" → "41".
  // Mirrors cd-dispatch-roster.js so on-duty / off-duty classification is
  // consistent across the app.
  function codeSuffix(code) {
    let c = String(code || '').toLowerCase().trim();
    if (!c) return '';
    c = c.replace(/^signal[\s\-_]*/, '').replace(/^s[\s\-_]+/, '');
    c = c.replace(/^10[\s\-_]+/, '');
    return c.trim();
  }

  // Templates that use ten-code on/off-duty status. Civilian and judicial
  // departments don't run shifts the same way (no dispatchable units, no
  // 10-41/10-42 convention) so we skip auto-status for them — clock-in
  // still works, just doesn't touch the user's ten-code.
  const STATUS_CAPABLE_TEMPLATES = { police: 1, ems: 1, fire: 1, dispatch: 1 };
  function deptUsesStatusCodes(dept) {
    if (!dept) return false;
    // The community endpoint serializes Department.template as an object
    // ({ _id, name, description }) — so we need template.name, not the
    // object itself. Also tolerate the legacy string form just in case.
    let t = '';
    if (typeof dept.template === 'string') {
      t = dept.template;
    } else if (dept.template && typeof dept.template === 'object') {
      t = dept.template.name || '';
    }
    t = t.toLowerCase().trim();
    return !!STATUS_CAPABLE_TEMPLATES[t];
  }

  // Find a ten-code in the community config whose code matches a target
  // suffix ("41" = on-duty, "42" = off-duty). Returns null when the
  // community hasn't configured one — in that case auto-status is a no-op.
  function findCodeBySuffix(tenCodes, targetSuffix) {
    if (!Array.isArray(tenCodes)) return null;
    for (const tc of tenCodes) {
      if (codeSuffix(tc && tc.code) === targetSuffix) return tc;
    }
    return null;
  }

  // PUT the user's ten-code for this department. Mirrors cd-status-panel's
  // setTenCode call so all downstream listeners (MDT bar, dispatch roster
  // socket broadcasts) update the same way as a manual status change.
  async function setMemberTenCode(cfg, tenCodeID) {
    if (!tenCodeID || !cfg.communityId || !cfg.userId || !cfg.departmentId) return;
    try {
      const res = await fetch(
        `${cfg.API_URL}/api/v1/community/${encodeURIComponent(cfg.communityId)}/members/${encodeURIComponent(cfg.userId)}/tenCode`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            departmentID: cfg.departmentId,
            tenCodeID: tenCodeID,
            activeDepartmentId: cfg.departmentId,
          }),
        },
      );
      if (!res.ok) return;
      // Mirror the local-cache writes cd-status-panel makes so the MDT
      // bar (and anything else reading window.ddConfig.communityData)
      // reflects the change without waiting for a refetch.
      if (window.ddConfig && window.ddConfig.communityData) {
        const members = window.ddConfig.communityData.members || {};
        if (members[cfg.userId]) {
          members[cfg.userId].tenCodeID = tenCodeID;
        } else {
          members[cfg.userId] = { tenCodeID: tenCodeID };
        }
        window.ddConfig.communityData.members = members;
      }
      if (typeof window.applyMDTStatus === 'function') {
        try { window.applyMDTStatus(); } catch (_) {}
      }
      // Re-init the Status Codes panel so its internal activeTenCodeID
      // catches up; cheap (just a community fetch + re-render).
      if (typeof window.cdStatusPanelInit === 'function') {
        try { window.cdStatusPanelInit(); } catch (_) {}
      }
    } catch (err) {
      console.warn('[dd-economy] auto-status set failed', err);
    }
  }

  // ---------- Rendering ----------

  function slotEl() { return document.getElementById(SLOT_ID); }
  function pillEl() { return document.getElementById(PILL_ID); }

  // Wrap colons in the timer string so CSS can blink them while the
  // hh and mm/ss segments stay rock-steady.
  function formatTimeHTML(seconds) {
    const t = fmtElapsed(seconds);
    return t.replace(/:/g, '<span class="sep">:</span>');
  }

  function renderEmpty() {
    const slot = slotEl();
    if (slot) slot.innerHTML = '';
    const pill = pillEl();
    if (pill) pill.innerHTML = '';
  }

  function renderPillActiveHere(state, startedAt, elapsedSec, earned) {
    const pill = pillEl();
    if (!pill) return;
    const session = state.session;
    pill.innerHTML = `
      <div class="dd-econ-pill" data-state="active">
        <div class="dd-econ-pill-head">
          <span class="dd-econ-pill-dot"></span>
          <span>On the clock</span>
        </div>
        <div class="dd-econ-pill-dept">${escapeHtml(session.departmentName || 'Active shift')}</div>
        <div class="dd-econ-pill-readout">
          <div class="dd-econ-pill-time" data-role="pill-time">${formatTimeHTML(elapsedSec)}</div>
          <div class="dd-econ-pill-earned" data-role="pill-earned">${fmtMoney(earned)}</div>
        </div>
        <div class="dd-econ-pill-actions">
          <a class="dd-econ-pill-btn ghost" href="/wallet"><i class="fa fa-wallet"></i> Wallet</a>
          <button class="dd-econ-pill-btn danger" data-action="pill-clock-out"><i class="fa fa-stop"></i> Clock out</button>
        </div>
      </div>
    `;
    pill.querySelector('[data-action="pill-clock-out"]').addEventListener('click', () => doClockOut(state));
  }

  function renderPillActiveElsewhere(state) {
    const pill = pillEl();
    if (!pill) return;
    const otherName = state.session.departmentName || 'another department';
    pill.innerHTML = `
      <div class="dd-econ-pill" data-state="other">
        <div class="dd-econ-pill-head">
          <i class="fa fa-triangle-exclamation" style="font-size:0.7rem;"></i>
          <span>Active elsewhere</span>
        </div>
        <div class="dd-econ-pill-dept">${escapeHtml(otherName)}</div>
        <div class="dd-econ-pill-actions">
          <button class="dd-econ-pill-btn danger" data-action="pill-clock-out"><i class="fa fa-stop"></i> Clock out</button>
        </div>
      </div>
    `;
    pill.querySelector('[data-action="pill-clock-out"]').addEventListener('click', () => doClockOut(state));
  }

  function renderPillIdle(state) {
    const pill = pillEl();
    if (!pill) return;
    const dept = state.dept || {};
    const rate = dept.basePayPerHour || 0;
    pill.innerHTML = `
      <div class="dd-econ-pill" data-state="idle">
        <div class="dd-econ-pill-head">
          <span class="dd-econ-pill-dot"></span>
          <span>Off duty</span>
        </div>
        <div class="dd-econ-pill-idle-sub">${escapeHtml(dept.name || 'This department')} · <b>${fmtMoney(rate)}</b>/hr</div>
        <div class="dd-econ-pill-actions">
          <button class="dd-econ-pill-btn primary" data-action="pill-clock-in"><i class="fa fa-play"></i> Clock in</button>
        </div>
      </div>
    `;
    pill.querySelector('[data-action="pill-clock-in"]').addEventListener('click', () => doClockIn(state));
  }

  function renderActiveHere(state) {
    ensureStyles();
    const session = state.session;
    const startedAt = new Date(session.startedAt || session.createdAt || Date.now()).getTime();
    const elapsedSec = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    const earned = Math.floor((session.payRateSnapshot || 0) * (elapsedSec / 3600));
    renderPillActiveHere(state, startedAt, elapsedSec, earned);
    const slot = slotEl();
    if (!slot) {
      // Pill-only mode (command/judicial). Still need the live tick.
      if (state.tickHandle) clearInterval(state.tickHandle);
      state.tickHandle = setInterval(() => {
        const pill = pillEl()?.querySelector('[data-state="active"]');
        if (!pill) { clearInterval(state.tickHandle); state.tickHandle = null; return; }
        const sec = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
        const tEl = pill.querySelector('[data-role="pill-time"]');
        const eEl = pill.querySelector('[data-role="pill-earned"]');
        if (tEl) tEl.innerHTML = formatTimeHTML(sec);
        if (eEl) eEl.textContent = fmtMoney(Math.floor((session.payRateSnapshot || 0) * (sec / 3600)));
      }, 1000);
      return;
    }
    slot.innerHTML = `
      <div class="dd-econ-wrap">
        <div class="dd-econ-card is-active" data-state="active">
          <div class="dd-econ-icon" style="position:relative;"><i class="fa fa-stopwatch"></i></div>
          <div class="dd-econ-body">
            <div class="dd-econ-title">On the clock <span style="color:#22c55e;">●</span></div>
            <div class="dd-econ-sub">${escapeHtml(session.departmentName || 'this department')}</div>
            <div class="dd-econ-metrics">
              <div>
                <div class="dd-econ-metric-label">Time</div>
                <div class="dd-econ-metric-value" data-role="time">${fmtElapsed(elapsedSec)}</div>
              </div>
              <div>
                <div class="dd-econ-metric-label">Earned (est.)</div>
                <div class="dd-econ-metric-value is-earned" data-role="earned">${fmtMoney(earned)}</div>
              </div>
            </div>
          </div>
          <div class="dd-econ-actions">
            <a class="dd-econ-btn dd-econ-btn-ghost" href="/wallet"><i class="fa fa-wallet"></i> Wallet</a>
            <button class="dd-econ-btn dd-econ-btn-danger" data-action="clock-out"><i class="fa fa-stop"></i> Clock out</button>
          </div>
        </div>
      </div>
    `;
    // Live tick — updates both the main card and the sidebar pill if present.
    if (state.tickHandle) clearInterval(state.tickHandle);
    state.tickHandle = setInterval(() => {
      const card = slot.querySelector('[data-state="active"]');
      if (!card) { clearInterval(state.tickHandle); state.tickHandle = null; return; }
      const sec = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      const earnedNow = Math.floor((session.payRateSnapshot || 0) * (sec / 3600));
      card.querySelector('[data-role="time"]').textContent = fmtElapsed(sec);
      card.querySelector('[data-role="earned"]').textContent = fmtMoney(earnedNow);
      const pillTime = pillEl()?.querySelector('[data-role="pill-time"]');
      const pillEarned = pillEl()?.querySelector('[data-role="pill-earned"]');
      if (pillTime) pillTime.innerHTML = formatTimeHTML(sec);
      if (pillEarned) pillEarned.textContent = fmtMoney(earnedNow);
    }, 1000);
    slot.querySelector('[data-action="clock-out"]').addEventListener('click', () => doClockOut(state));
  }

  function renderActiveElsewhere(state) {
    ensureStyles();
    renderPillActiveElsewhere(state);
    const slot = slotEl();
    if (!slot) return;
    const otherName = state.session.departmentName || 'another department';
    slot.innerHTML = `
      <div class="dd-econ-wrap">
        <div class="dd-econ-card is-other">
          <div class="dd-econ-icon"><i class="fa fa-triangle-exclamation"></i></div>
          <div class="dd-econ-body">
            <div class="dd-econ-title">You're on the clock at ${escapeHtml(otherName)}</div>
            <div class="dd-econ-sub">Clock out first if you want to clock in here.</div>
          </div>
          <div class="dd-econ-actions">
            <a class="dd-econ-btn dd-econ-btn-ghost" href="/wallet"><i class="fa fa-wallet"></i> Wallet</a>
            <button class="dd-econ-btn dd-econ-btn-danger" data-action="clock-out"><i class="fa fa-stop"></i> Clock out</button>
          </div>
        </div>
      </div>
    `;
    slot.querySelector('[data-action="clock-out"]').addEventListener('click', () => doClockOut(state));
  }

  function renderIdle(state) {
    ensureStyles();
    renderPillIdle(state);
    const slot = slotEl();
    if (!slot) return;
    const dept = state.dept || {};
    const rate = dept.basePayPerHour || 0;
    slot.innerHTML = `
      <div class="dd-econ-wrap">
        <div class="dd-econ-card">
          <div class="dd-econ-icon"><i class="fa fa-briefcase"></i></div>
          <div class="dd-econ-body">
            <div class="dd-econ-title">Clock in to ${escapeHtml(dept.name || 'this department')}</div>
            <div class="dd-econ-sub">Earn ${fmtMoney(rate)} / hr base while you work shifts.</div>
          </div>
          <div class="dd-econ-actions">
            <a class="dd-econ-btn dd-econ-btn-ghost" href="/wallet"><i class="fa fa-wallet"></i> Wallet</a>
            <button class="dd-econ-btn dd-econ-btn-primary" data-action="clock-in"><i class="fa fa-play"></i> Clock in</button>
          </div>
        </div>
      </div>
    `;
    slot.querySelector('[data-action="clock-in"]').addEventListener('click', () => doClockIn(state));
  }

  // ---------- Actions ----------

  async function doClockIn(state) {
    const cfg = state.cfg;
    if (!cfg.communityId || !cfg.departmentId || !state.civId) return;
    const btn = slotEl()?.querySelector('[data-action="clock-in"]')
             || pillEl()?.querySelector('[data-action="pill-clock-in"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Clocking in…'; }
    try {
      const res = await fetch(`${cfg.API_URL}/api/v2/economy/clock-in?userId=${encodeURIComponent(cfg.userId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communityId: cfg.communityId,
          departmentId: cfg.departmentId,
          civilianId: state.civId,
        }),
      });
      if (!res.ok) throw new Error('clock-in failed: ' + res.status);
      // Auto-set the user's status to the community's on-duty code ("X-41")
      // so dispatch + MDT reflect the shift change without a second click.
      // Only applies to dept templates that actually run shifts on the
      // 10-41/10-42 convention (police / ems / fire / dispatch).
      const eligible = deptUsesStatusCodes(state.dept);
      const onDutyCode = eligible ? findCodeBySuffix(state.communityEcon.tenCodes, '41') : null;
      console.log('[dd-economy] auto on-duty:',
        { eligible, deptTemplate: state.dept && state.dept.template,
          tenCodesCount: (state.communityEcon.tenCodes || []).length,
          found: onDutyCode && onDutyCode.code });
      if (onDutyCode) {
        await setMemberTenCode(cfg, onDutyCode._id);
      }
      await refresh(state);
    } catch (err) {
      console.error('[dd-economy] clock-in failed', err);
      if (window.showToast) window.showToast('Could not clock in', 2500, 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa fa-play"></i> Clock in'; }
    }
  }

  async function doClockOut(state) {
    if (!state.session) return;
    const cfg = state.cfg;
    const btn = slotEl()?.querySelector('[data-action="clock-out"]')
             || pillEl()?.querySelector('[data-action="pill-clock-out"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Clocking out…'; }
    try {
      const res = await fetch(`${cfg.API_URL}/api/v2/economy/clock-out?userId=${encodeURIComponent(cfg.userId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: state.session._id }),
      });
      if (!res.ok) throw new Error('clock-out failed: ' + res.status);
      // Auto-set the user's status to the community's off-duty code ("X-42").
      // Gated to status-capable templates (see clock-in path).
      const eligible = deptUsesStatusCodes(state.dept);
      const offDutyCode = eligible ? findCodeBySuffix(state.communityEcon.tenCodes, '42') : null;
      console.log('[dd-economy] auto off-duty:',
        { eligible, deptTemplate: state.dept && state.dept.template,
          tenCodesCount: (state.communityEcon.tenCodes || []).length,
          found: offDutyCode && offDutyCode.code });
      if (offDutyCode) {
        await setMemberTenCode(cfg, offDutyCode._id);
      }
      if (state.tickHandle) { clearInterval(state.tickHandle); state.tickHandle = null; }
      await refresh(state);
    } catch (err) {
      console.error('[dd-economy] clock-out failed', err);
      if (window.showToast) window.showToast('Could not clock out', 2500, 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa fa-stop"></i> Clock out'; }
    }
  }

  // ---------- State machine ----------

  async function refresh(state) {
    const cfg = state.cfg;
    state.session = await fetchActiveSession(cfg, state.civId);
    if (state.session) {
      if (state.session.departmentId === cfg.departmentId) {
        renderActiveHere(state);
      } else {
        renderActiveElsewhere(state);
      }
      return;
    }
    // Not on the clock — show idle clock-in if economy is enabled here and
    // the user is eligible.
    if (!state.communityEcon.economyEnabled || !state.dept || !state.dept.economyEnabled) {
      renderEmpty();
      return;
    }
    const isExplicitMember = (state.dept.members || []).some(m => m.userID === cfg.userId);
    const approvalRequired = !!state.dept.approvalRequired;
    const eligible = isExplicitMember || !approvalRequired;
    if (!eligible) { renderEmpty(); return; }
    renderIdle(state);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ---------- Boot ----------

  async function boot() {
    const cfg = getCfg();
    if (!cfg || !cfg.communityId || !cfg.departmentId) return;
    // Wait until the overview slot is in the DOM (the dashboard renders
    // panels asynchronously after fetching departments).
    let tries = 0;
    while (!slotEl() && !pillEl() && tries++ < 80) {
      await new Promise(r => setTimeout(r, 75));
    }
    if (!slotEl() && !pillEl()) return;

    const state = {
      cfg,
      civId: '',
      session: null,
      communityEcon: { economyEnabled: false },
      dept: null,
      tickHandle: null,
    };

    state.civId = await fetchActiveCivilianId(cfg);
    const econ = await fetchCommunityEcon(cfg);
    state.communityEcon = econ;
    state.dept = econ.dept;

    if (!state.civId) {
      // No civilian for this user in this community — nothing to do here.
      renderEmpty();
      return;
    }

    await refresh(state);

    // Heartbeat for active sessions so the server-side AFK timers stay alive
    // while the user is on the dashboard.
    setInterval(async () => {
      if (!state.session) return;
      try {
        await fetch(`${cfg.API_URL}/api/v2/economy/heartbeat?userId=${encodeURIComponent(cfg.userId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: state.session._id }),
        });
      } catch (err) { /* swallow */ }
    }, 30000);

    // Poll for state drift every 60s so a session that ends remotely (server
    // AFK sweep, clock-out from /wallet, etc.) is reflected here too.
    setInterval(() => { refresh(state); }, 60000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
