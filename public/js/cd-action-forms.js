/**
 * Command Dashboard — Civilian Action Forms
 *
 * Provides themed slide-in panel forms for issuing citations, warnings,
 * arrest reports, and warrant requests from the command dashboard.
 *
 * Registers:
 *   window.cdShowCitationForm(civId, civName, callback)
 *   window.cdShowWarningForm(civId, civName, callback)
 *   window.cdShowArrestForm(civId, civName, civData, callback)
 *   window.cdShowWarrantForm(civId, civName, callback)
 *   window.cdCloseActionForm()
 *
 * Dependencies:
 *   - jQuery ($)
 *   - window.ddConfig  { API_URL, communityId, userId, departmentId, userName, dbUser }
 *   - window.esc()     HTML-escape helper
 *   - window.ddToast() Toast notification helper
 */
;(function () {
  'use strict';

  /* ───────────────────────── Helpers & Config ───────────────────────── */

  function cfg() { return window.ddConfig || {}; }
  function apiUrl() { return cfg().API_URL || ''; }
  function esc(s) {
    return window.esc
      ? window.esc(s)
      : String(s || '').replace(/[&<>"']/g, function (c) {
          return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
  }
  function toast(msg, type) { if (window.ddToast) window.ddToast(msg, type); }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
  function nowTimeStr() {
    var d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' +
      String(d.getMinutes()).padStart(2, '0');
  }
  function genReportNumber() {
    return Math.floor(1000000 + Math.random() * 9000000);
  }

  /* ───────────────────────── Penal Codes Cache ───────────────────────── */

  var penalCodesCache = null;
  var penalCodesFetching = false;
  var penalCodesCallbacks = [];

  function fetchPenalCodes(cb) {
    if (penalCodesCache) { cb(null, penalCodesCache); return; }
    penalCodesCallbacks.push(cb);
    if (penalCodesFetching) return;
    penalCodesFetching = true;

    var c = cfg();
    $.ajax({
      url: apiUrl() + '/api/v1/community/' + encodeURIComponent(c.communityId) + '/penal-codes',
      method: 'GET',
      dataType: 'json',
      success: function (res) {
        penalCodesCache = res;
        penalCodesFetching = false;
        var cbs = penalCodesCallbacks.splice(0);
        for (var i = 0; i < cbs.length; i++) cbs[i](null, res);
      },
      error: function (xhr) {
        penalCodesFetching = false;
        var cbs = penalCodesCallbacks.splice(0);
        for (var i = 0; i < cbs.length; i++) cbs[i](new Error('Failed to load penal codes'));
      }
    });
  }

  /* ───────────────────────── Panel State ───────────────────────── */

  var panelOpen = false;
  var stylesInjected = false;
  var activeCallback = null;
  var submitting = false;

  /* ───────────────────────── Style Injection ───────────────────────── */

  function injectStyles() {
    if (stylesInjected) return;
    if (document.getElementById('cd-af-styles')) { stylesInjected = true; return; }

    var css = [
      /* Backdrop */
      '.cd-af-backdrop {',
      '  position: fixed; inset: 0;',
      '  background: rgba(0,0,0,0.5);',
      '  backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);',
      '  z-index: 9998;',
      '  opacity: 0;',
      '  transition: opacity 0.3s cubic-bezier(0.4,0,0.2,1);',
      '  pointer-events: none;',
      '}',
      '.cd-af-backdrop.cd-af-open {',
      '  opacity: 1; pointer-events: auto;',
      '}',

      /* Panel */
      '.cd-af-panel {',
      '  position: fixed; top: 0; right: 0;',
      '  width: 420px; height: 100vh;',
      '  z-index: 9999;',
      '  background: rgba(12,13,18,0.97);',
      '  border-left: 1px solid var(--cd-glass-border, rgba(255,255,255,0.06));',
      '  transform: translateX(100%);',
      '  transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);',
      '  display: flex; flex-direction: column;',
      '  font-family: "Outfit", sans-serif;',
      '}',
      '.cd-af-panel.cd-af-open {',
      '  transform: translateX(0);',
      '}',

      /* Header */
      '.cd-af-header {',
      '  padding: 20px 24px 16px;',
      '  border-bottom: 1px solid var(--cd-glass-border, rgba(255,255,255,0.06));',
      '  flex-shrink: 0; position: relative;',
      '}',
      '.cd-af-header-title {',
      '  display: flex; align-items: center; gap: 10px;',
      '  font-size: 18px; font-weight: 600;',
      '  color: var(--cd-text, #e2e8f0);',
      '}',
      '.cd-af-header-title i {',
      '  color: var(--cd-accent, #38bdf8); font-size: 16px;',
      '}',
      '.cd-af-header-sub {',
      '  font-size: 13px; color: var(--cd-text-muted, #64748b);',
      '  margin-top: 4px;',
      '}',
      '.cd-af-close {',
      '  position: absolute; top: 18px; right: 20px;',
      '  width: 36px; height: 36px;',
      '  display: flex; align-items: center; justify-content: center;',
      '  background: var(--cd-glass, rgba(255,255,255,0.04));',
      '  border: 1px solid var(--cd-glass-border, rgba(255,255,255,0.06));',
      '  border-radius: 10px;',
      '  color: var(--cd-text-muted, #64748b);',
      '  font-size: 16px; cursor: pointer;',
      '  transition: all 0.15s;',
      '}',
      '.cd-af-close:hover {',
      '  background: var(--cd-glass-hover, rgba(255,255,255,0.07));',
      '  color: var(--cd-text, #e2e8f0);',
      '}',

      /* Body */
      '.cd-af-body {',
      '  flex: 1; overflow-y: auto; padding: 20px 24px;',
      '  overscroll-behavior: contain;',
      '}',
      '.cd-af-body::-webkit-scrollbar { width: 6px; }',
      '.cd-af-body::-webkit-scrollbar-track { background: transparent; }',
      '.cd-af-body::-webkit-scrollbar-thumb {',
      '  background: rgba(255,255,255,0.08); border-radius: 3px;',
      '}',

      /* Footer */
      '.cd-af-footer {',
      '  padding: 16px 24px;',
      '  border-top: 1px solid var(--cd-glass-border, rgba(255,255,255,0.06));',
      '  display: flex; gap: 10px; justify-content: flex-end;',
      '  flex-shrink: 0;',
      '}',

      /* Buttons */
      '.cd-af-btn-cancel {',
      '  background: var(--cd-glass, rgba(255,255,255,0.04));',
      '  color: var(--cd-text-muted, #64748b);',
      '  border: 1px solid var(--cd-glass-border, rgba(255,255,255,0.06));',
      '  border-radius: var(--cd-radius-sm, 8px);',
      '  padding: 10px 20px; font-size: 14px; font-weight: 500;',
      '  font-family: "Outfit", sans-serif; cursor: pointer;',
      '  transition: all 0.15s;',
      '}',
      '.cd-af-btn-cancel:hover {',
      '  background: var(--cd-glass-hover, rgba(255,255,255,0.07));',
      '  color: var(--cd-text, #e2e8f0);',
      '}',
      '.cd-af-btn-submit {',
      '  background: rgba(56,189,248,0.15);',
      '  color: var(--cd-accent, #38bdf8);',
      '  border: 1px solid rgba(56,189,248,0.25);',
      '  border-radius: var(--cd-radius-sm, 8px);',
      '  padding: 10px 24px; font-size: 14px; font-weight: 600;',
      '  font-family: "Outfit", sans-serif; cursor: pointer;',
      '  transition: all 0.15s;',
      '}',
      '.cd-af-btn-submit:hover:not(:disabled) {',
      '  background: rgba(56,189,248,0.25);',
      '}',
      '.cd-af-btn-submit:disabled, .cd-af-btn-cancel:disabled {',
      '  opacity: 0.5; cursor: not-allowed;',
      '}',
      '.cd-af-btn-submit.cd-af-btn-danger {',
      '  background: rgba(239,68,68,0.15);',
      '  color: var(--cd-red, #ef4444);',
      '  border-color: rgba(239,68,68,0.25);',
      '}',
      '.cd-af-btn-submit.cd-af-btn-danger:hover:not(:disabled) {',
      '  background: rgba(239,68,68,0.25);',
      '}',

      /* Form elements */
      '.cd-af-label {',
      '  display: block; font-size: 12px; font-weight: 600;',
      '  color: var(--cd-text-muted, #64748b);',
      '  text-transform: uppercase; letter-spacing: 0.05em;',
      '  margin-bottom: 6px;',
      '}',
      '.cd-af-input, .cd-af-textarea, .cd-af-select {',
      '  width: 100%; box-sizing: border-box;',
      '  background: var(--cd-glass, rgba(255,255,255,0.04));',
      '  border: 1px solid var(--cd-glass-border, rgba(255,255,255,0.06));',
      '  border-radius: var(--cd-radius-sm, 8px);',
      '  color: var(--cd-text, #e2e8f0);',
      '  font-family: "Outfit", sans-serif; font-size: 14px;',
      '  padding: 10px 12px;',
      '  transition: border-color 0.15s, box-shadow 0.15s;',
      '  outline: none;',
      '}',
      '.cd-af-input:focus, .cd-af-textarea:focus, .cd-af-select:focus {',
      '  border-color: var(--cd-accent, #38bdf8);',
      '  box-shadow: 0 0 0 3px rgba(56,189,248,0.1);',
      '}',
      '.cd-af-input::placeholder, .cd-af-textarea::placeholder {',
      '  color: var(--cd-text-dim, #475569);',
      '}',
      '.cd-af-input[readonly] {',
      '  opacity: 0.6; cursor: default;',
      '}',
      '.cd-af-textarea {',
      '  resize: vertical; min-height: 80px; line-height: 1.5;',
      '}',
      '.cd-af-select {',
      '  appearance: none; -webkit-appearance: none;',
      '  background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath d=\'M3 5l3 3 3-3\' stroke=\'%2364748b\' fill=\'none\' stroke-width=\'1.5\'/%3E%3C/svg%3E");',
      '  background-repeat: no-repeat;',
      '  background-position: right 12px center;',
      '  padding-right: 32px;',
      '}',
      '.cd-af-field { margin-bottom: 16px; }',
      '.cd-af-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }',

      /* Character counter */
      '.cd-af-char-count {',
      '  text-align: right; font-size: 11px;',
      '  color: var(--cd-text-dim, #475569);',
      '  margin-top: 4px;',
      '}',
      '.cd-af-char-count.cd-af-char-warn { color: var(--cd-amber, #f59e0b); }',
      '.cd-af-char-count.cd-af-char-over { color: var(--cd-red, #ef4444); }',

      /* Toggle */
      '.cd-af-toggle-wrap {',
      '  display: flex; gap: 8px;',
      '}',
      '.cd-af-toggle-btn {',
      '  padding: 8px 18px; border-radius: var(--cd-radius-sm, 8px);',
      '  font-size: 13px; font-weight: 500; font-family: "Outfit", sans-serif;',
      '  cursor: pointer; transition: all 0.15s;',
      '  background: var(--cd-glass, rgba(255,255,255,0.04));',
      '  color: var(--cd-text-muted, #64748b);',
      '  border: 1px solid var(--cd-glass-border, rgba(255,255,255,0.06));',
      '}',
      '.cd-af-toggle-btn.cd-af-toggle-active {',
      '  background: rgba(56,189,248,0.15);',
      '  color: var(--cd-accent, #38bdf8);',
      '  border-color: rgba(56,189,248,0.25);',
      '}',

      /* Total fine display */
      '.cd-af-total-fine {',
      '  display: flex; align-items: center; justify-content: space-between;',
      '  padding: 12px 16px; margin-top: 12px;',
      '  background: rgba(56,189,248,0.06);',
      '  border: 1px solid rgba(56,189,248,0.15);',
      '  border-radius: var(--cd-radius-sm, 8px);',
      '}',
      '.cd-af-total-fine-label {',
      '  font-size: 13px; font-weight: 500;',
      '  color: var(--cd-text-muted, #64748b);',
      '}',
      '.cd-af-total-fine-amount {',
      '  font-size: 20px; font-weight: 700;',
      '  color: var(--cd-accent, #38bdf8);',
      '}',

      /* Violations / Checkboxes */
      '.cd-af-violations-loading {',
      '  display: flex; align-items: center; justify-content: center;',
      '  padding: 24px; color: var(--cd-text-muted, #64748b); font-size: 13px;',
      '}',
      '.cd-af-violations-loading i {',
      '  margin-right: 8px; animation: cd-af-spin 1s linear infinite;',
      '}',
      '@keyframes cd-af-spin { to { transform: rotate(360deg); } }',
      '.cd-af-violations-error {',
      '  padding: 12px 16px; font-size: 13px;',
      '  color: var(--cd-red, #ef4444);',
      '  background: rgba(239,68,68,0.06);',
      '  border-radius: var(--cd-radius-sm, 8px);',
      '}',

      /* Search input */
      '.cd-af-search-wrap {',
      '  position: relative; margin-bottom: 10px;',
      '}',
      '.cd-af-search-icon {',
      '  position: absolute; left: 12px; top: 50%; transform: translateY(-50%);',
      '  color: var(--cd-text-dim, #475569); font-size: 13px;',
      '  pointer-events: none; transition: color 0.15s;',
      '}',
      '.cd-af-search-input {',
      '  width: 100%; padding: 9px 12px 9px 34px;',
      '  font-size: 13px; font-family: inherit;',
      '  color: var(--cd-text, #e2e8f0);',
      '  background: var(--cd-glass, rgba(255,255,255,0.04));',
      '  border: 1px solid var(--cd-glass-border, rgba(255,255,255,0.06));',
      '  border-radius: 8px; outline: none;',
      '  transition: border-color 0.15s, box-shadow 0.15s;',
      '}',
      '.cd-af-search-input::placeholder {',
      '  color: var(--cd-text-dim, #475569);',
      '}',
      '.cd-af-search-input:focus {',
      '  border-color: rgba(56,189,248,0.4);',
      '  box-shadow: 0 0 0 3px rgba(56,189,248,0.08);',
      '}',
      '.cd-af-search-input:focus + .cd-af-search-icon {',
      '  color: var(--cd-accent, #38bdf8);',
      '}',
      '.cd-af-search-clear {',
      '  position: absolute; right: 8px; top: 50%; transform: translateY(-50%);',
      '  width: 22px; height: 22px; border: none; background: transparent;',
      '  color: var(--cd-text-dim, #475569); font-size: 12px;',
      '  cursor: pointer; border-radius: 4px;',
      '  display: none; align-items: center; justify-content: center;',
      '  transition: color 0.12s, background 0.12s;',
      '}',
      '.cd-af-search-clear:hover {',
      '  color: var(--cd-text, #e2e8f0);',
      '  background: rgba(255,255,255,0.08);',
      '}',
      '.cd-af-search-clear.cd-af-visible { display: flex; }',
      '.cd-af-search-empty {',
      '  padding: 20px 12px; text-align: center;',
      '  font-size: 13px; color: var(--cd-text-dim, #475569);',
      '  display: none;',
      '}',
      '.cd-af-search-empty.cd-af-visible { display: block; }',

      /* Selected pills tray */
      '.cd-af-pills-tray {',
      '  display: flex; flex-wrap: wrap; gap: 6px;',
      '  margin-bottom: 10px; min-height: 0;',
      '}',
      '.cd-af-pills-tray:empty { display: none; }',
      '.cd-af-pill {',
      '  display: inline-flex; align-items: center; gap: 5px;',
      '  padding: 4px 8px 4px 10px;',
      '  font-size: 11px; font-weight: 600;',
      '  color: #050a12;',
      '  background: var(--cd-accent, #38bdf8);',
      '  border-radius: 20px; cursor: default;',
      '  animation: cd-af-pill-in 0.15s ease-out;',
      '  white-space: nowrap; max-width: 100%;',
      '}',
      '@keyframes cd-af-pill-in {',
      '  from { opacity: 0; transform: scale(0.85); }',
      '  to   { opacity: 1; transform: scale(1); }',
      '}',
      '.cd-af-pill-text {',
      '  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;',
      '}',
      '.cd-af-pill-x {',
      '  width: 16px; height: 16px; flex-shrink: 0;',
      '  display: flex; align-items: center; justify-content: center;',
      '  font-size: 10px; font-weight: 900; line-height: 1;',
      '  border-radius: 50%;',
      '  background: rgba(0,0,0,0.18);',
      '  color: rgba(5,10,18,0.7);',
      '  cursor: pointer; border: none; padding: 0;',
      '  transition: background 0.12s, color 0.12s;',
      '}',
      '.cd-af-pill-x:hover {',
      '  background: rgba(0,0,0,0.35);',
      '  color: #050a12;',
      '}',

      /* Scrollable list container */
      '.cd-af-violations-scroll {',
      '  max-height: 300px; overflow-y: auto;',
      '  border: 1px solid var(--cd-glass-border, rgba(255,255,255,0.06));',
      '  border-radius: 8px;',
      '  background: rgba(0,0,0,0.15);',
      '  overscroll-behavior: contain;',
      '  padding: 4px;',
      '}',
      '.cd-af-violations-scroll::-webkit-scrollbar { width: 5px; }',
      '.cd-af-violations-scroll::-webkit-scrollbar-track { background: transparent; }',
      '.cd-af-violations-scroll::-webkit-scrollbar-thumb {',
      '  background: rgba(255,255,255,0.1); border-radius: 3px;',
      '}',
      '.cd-af-violations-scroll::-webkit-scrollbar-thumb:hover {',
      '  background: rgba(255,255,255,0.18);',
      '}',

      '.cd-af-cat-group { margin-bottom: 6px; }',
      '.cd-af-cat-group.cd-af-hidden { display: none; }',
      '.cd-af-cat-header {',
      '  font-size: 11px; font-weight: 700;',
      '  color: var(--cd-text-dim, #475569);',
      '  text-transform: uppercase; letter-spacing: 0.06em;',
      '  padding: 10px 6px 4px; margin-bottom: 2px;',
      '  border-bottom: 1px solid rgba(255,255,255,0.04);',
      '  position: sticky; top: -4px; z-index: 1;',
      '  background: rgba(12,13,18,1);',
      '}',
      '.cd-af-cb-item {',
      '  display: flex; align-items: center; gap: 10px;',
      '  padding: 7px 10px; border-radius: 6px;',
      '  cursor: pointer; transition: background 0.12s;',
      '  border: 1px solid transparent;',
      '}',
      '.cd-af-cb-item.cd-af-hidden { display: none; }',
      '.cd-af-cb-item:hover {',
      '  background: var(--cd-glass-hover, rgba(255,255,255,0.07));',
      '}',
      '.cd-af-cb-item.cd-af-cb-checked {',
      '  background: rgba(56,189,248,0.06);',
      '  border-color: rgba(56,189,248,0.2);',
      '}',
      '.cd-af-cb-box {',
      '  width: 18px; height: 18px; flex-shrink: 0;',
      '  border-radius: 4px;',
      '  border: 2px solid var(--cd-text-dim, #475569);',
      '  display: flex; align-items: center; justify-content: center;',
      '  transition: all 0.15s;',
      '}',
      '.cd-af-cb-checked .cd-af-cb-box {',
      '  background: var(--cd-accent, #38bdf8);',
      '  border-color: var(--cd-accent, #38bdf8);',
      '}',
      '.cd-af-cb-check {',
      '  display: none; color: #050a12; font-size: 10px; font-weight: 900;',
      '}',
      '.cd-af-cb-checked .cd-af-cb-check { display: block; }',
      '.cd-af-cb-label {',
      '  flex: 1; font-size: 13px; color: var(--cd-text, #e2e8f0);',
      '}',
      '.cd-af-cb-fine {',
      '  font-size: 12px; color: var(--cd-amber, #f59e0b); font-weight: 600;',
      '  white-space: nowrap;',
      '}',

      /* Section divider */
      '.cd-af-section {',
      '  font-size: 12px; font-weight: 700;',
      '  color: var(--cd-text-muted, #64748b);',
      '  text-transform: uppercase; letter-spacing: 0.05em;',
      '  margin: 20px 0 10px; padding-bottom: 6px;',
      '  border-bottom: 1px solid var(--cd-glass-border, rgba(255,255,255,0.06));',
      '}',

      /* Inline validation error */
      '.cd-af-error-banner {',
      '  background: rgba(239,68,68,0.12);',
      '  border: 1px solid rgba(239,68,68,0.3);',
      '  border-radius: 6px;',
      '  padding: 8px 12px;',
      '  margin-bottom: 10px;',
      '  font-size: 13px;',
      '  color: #fca5a5;',
      '  display: flex; align-items: center; gap: 8px;',
      '}',
      '.cd-af-error-banner i { color: #ef4444; flex-shrink: 0; }',

      /* Responsive */
      '@media (max-width: 480px) {',
      '  .cd-af-panel { width: 100%; }',
      '  .cd-af-grid { grid-template-columns: 1fr; }',
      '}'
    ].join('\n');

    var el = document.createElement('style');
    el.id = 'cd-af-styles';
    el.textContent = css;
    document.head.appendChild(el);
    stylesInjected = true;
  }

  /* ───────────────────────── DOM Bootstrap ───────────────────────── */

  function ensureDOM() {
    injectStyles();
    if (document.getElementById('cd-af-backdrop')) return;

    var backdrop = document.createElement('div');
    backdrop.id = 'cd-af-backdrop';
    backdrop.className = 'cd-af-backdrop';
    backdrop.addEventListener('click', closePanel);

    var panel = document.createElement('div');
    panel.id = 'cd-af-panel';
    panel.className = 'cd-af-panel';

    document.body.appendChild(backdrop);
    document.body.appendChild(panel);
  }

  /* ───────────────────────── Panel Open / Close ───────────────────────── */

  function openPanel(headerIcon, headerTitle, subText, bodyHTML, footerHTML) {
    ensureDOM();
    panelOpen = true;
    submitting = false;

    var panel = document.getElementById('cd-af-panel');
    panel.innerHTML =
      '<div class="cd-af-header">' +
        '<div class="cd-af-header-title"><i class="fa ' + esc(headerIcon) + '"></i> ' + esc(headerTitle) + '</div>' +
        '<div class="cd-af-header-sub">' + esc(subText) + '</div>' +
        '<button class="cd-af-close" type="button"><i class="fa fa-times"></i></button>' +
      '</div>' +
      '<div class="cd-af-body">' + bodyHTML + '</div>' +
      '<div class="cd-af-footer">' + footerHTML + '</div>';

    panel.querySelector('.cd-af-close').addEventListener('click', closePanel);

    /* Trigger reflow then animate */
    void panel.offsetHeight;
    document.getElementById('cd-af-backdrop').classList.add('cd-af-open');
    panel.classList.add('cd-af-open');
    document.body.style.overflow = 'hidden';

    /* ESC key */
    document.addEventListener('keydown', onEscKey);
  }

  function closePanel() {
    if (!panelOpen) return;
    panelOpen = false;
    activeCallback = null;
    document.getElementById('cd-af-backdrop').classList.remove('cd-af-open');
    document.getElementById('cd-af-panel').classList.remove('cd-af-open');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onEscKey);
  }

  function onEscKey(e) {
    if (e.key === 'Escape' || e.keyCode === 27) closePanel();
  }

  function showPanelError(msg) {
    clearPanelError();
    var footer = document.querySelector('.cd-af-footer');
    if (!footer) return;
    var banner = document.createElement('div');
    banner.className = 'cd-af-error-banner';
    banner.innerHTML = '<i class="fa fa-exclamation-circle"></i> ' + esc(msg);
    footer.insertBefore(banner, footer.firstChild);
  }

  function clearPanelError() {
    var existing = document.querySelectorAll('.cd-af-error-banner');
    for (var i = 0; i < existing.length; i++) existing[i].remove();
  }

  function setSubmitting(busy) {
    submitting = busy;
    var btns = document.querySelectorAll('.cd-af-footer button');
    for (var i = 0; i < btns.length; i++) btns[i].disabled = busy;
    var sub = document.querySelector('.cd-af-btn-submit');
    if (sub) {
      sub.innerHTML = busy
        ? '<i class="fa fa-circle-notch fa-spin"></i> Submitting...'
        : esc(sub.getAttribute('data-label') || 'Submit');
    }
  }

  /* ───────────────────────── Violations Renderer ───────────────────────── */

  /**
   * Renders the penal-code checkbox list into a target container.
   * Returns a function that retrieves currently-selected violations.
   *
   * @param {string}   containerId  ID of the container element
   * @param {object}   [opts]       { showFines: true, onChange: fn }
   * @returns {function} getSelected => [{ name, fine, category }]
   */
  function renderViolations(containerId, opts) {
    opts = opts || {};
    var container = document.getElementById(containerId);
    if (!container) return function () { return []; };

    container.innerHTML =
      '<div class="cd-af-violations-loading"><i class="fa fa-circle-notch fa-spin"></i> Loading penal codes...</div>';

    var selected = {};

    fetchPenalCodes(function (err, data) {
      if (err || !data || !data.categories) {
        container.innerHTML = '<div class="cd-af-violations-error">Failed to load penal codes. Please close and try again.</div>';
        return;
      }

      var currency = data.currency || 'USD';

      /* Build list HTML */
      var listHtml = '';
      for (var ci = 0; ci < data.categories.length; ci++) {
        var cat = data.categories[ci];
        if (!cat.violations || !cat.violations.length) continue;
        listHtml += '<div class="cd-af-cat-group">';
        listHtml += '<div class="cd-af-cat-header">' + esc(cat.name) + '</div>';

        for (var vi = 0; vi < cat.violations.length; vi++) {
          var v = cat.violations[vi];
          var uid = containerId + '-v-' + ci + '-' + vi;
          var fineStr = (opts.showFines !== false && v.fine)
            ? formatCurrency(v.fine, currency)
            : '';
          listHtml += '<div class="cd-af-cb-item" data-uid="' + uid + '" data-name="' + esc(v.name) + '" data-fine="' + (v.fine || 0) + '" data-cat="' + esc(cat.name) + '">';
          listHtml += '  <div class="cd-af-cb-box"><i class="fa fa-check cd-af-cb-check"></i></div>';
          listHtml += '  <span class="cd-af-cb-label">' + esc(v.name) + '</span>';
          if (fineStr) listHtml += '  <span class="cd-af-cb-fine">' + esc(fineStr) + '</span>';
          listHtml += '</div>';
        }
        listHtml += '</div>';
      }

      if (!listHtml) {
        container.innerHTML = '<div class="cd-af-violations-error">No penal codes found for this community.</div>';
        return;
      }

      /* Assemble: search + pills + scrollable list */
      container.innerHTML =
        '<div class="cd-af-search-wrap">' +
          '<input type="text" class="cd-af-search-input" placeholder="Search charges..." autocomplete="off" />' +
          '<i class="fa fa-search cd-af-search-icon"></i>' +
          '<button type="button" class="cd-af-search-clear" title="Clear search"><i class="fa fa-times"></i></button>' +
        '</div>' +
        '<div class="cd-af-pills-tray"></div>' +
        '<div class="cd-af-violations-scroll">' + listHtml + '</div>' +
        '<div class="cd-af-search-empty">No charges match your search</div>';

      var searchInput = container.querySelector('.cd-af-search-input');
      var searchClear = container.querySelector('.cd-af-search-clear');
      var pillsTray = container.querySelector('.cd-af-pills-tray');
      var scrollWrap = container.querySelector('.cd-af-violations-scroll');
      var emptyMsg = container.querySelector('.cd-af-search-empty');

      /* ── Search filtering ── */
      function filterList() {
        var q = (searchInput.value || '').toLowerCase().trim();
        searchClear.classList.toggle('cd-af-visible', q.length > 0);

        var groups = scrollWrap.querySelectorAll('.cd-af-cat-group');
        var anyVisible = false;

        for (var gi = 0; gi < groups.length; gi++) {
          var items = groups[gi].querySelectorAll('.cd-af-cb-item');
          var groupHasVisible = false;

          for (var ii = 0; ii < items.length; ii++) {
            var name = (items[ii].getAttribute('data-name') || '').toLowerCase();
            var match = !q || name.indexOf(q) !== -1;
            items[ii].classList.toggle('cd-af-hidden', !match);
            if (match) groupHasVisible = true;
          }

          groups[gi].classList.toggle('cd-af-hidden', !groupHasVisible);
          if (groupHasVisible) anyVisible = true;
        }

        emptyMsg.classList.toggle('cd-af-visible', !anyVisible);
      }

      searchInput.addEventListener('input', filterList);
      searchClear.addEventListener('click', function () {
        searchInput.value = '';
        filterList();
        searchInput.focus();
      });

      /* ── Pills management ── */
      function refreshPills() {
        pillsTray.innerHTML = '';
        var keys = Object.keys(selected);
        for (var i = 0; i < keys.length; i++) {
          var s = selected[keys[i]];
          var uid = keys[i];
          var pill = document.createElement('span');
          pill.className = 'cd-af-pill';
          pill.innerHTML =
            '<span class="cd-af-pill-text">' + esc(s.name) + '</span>' +
            '<button type="button" class="cd-af-pill-x" data-uid="' + uid + '"><i class="fa fa-times"></i></button>';
          pillsTray.appendChild(pill);
        }

        /* Attach dismiss handlers */
        var xBtns = pillsTray.querySelectorAll('.cd-af-pill-x');
        for (var j = 0; j < xBtns.length; j++) {
          xBtns[j].addEventListener('click', function (e) {
            e.stopPropagation();
            var removeUid = this.getAttribute('data-uid');
            delete selected[removeUid];
            /* Uncheck the corresponding item */
            var el = scrollWrap.querySelector('[data-uid="' + removeUid + '"]');
            if (el) el.classList.remove('cd-af-cb-checked');
            refreshPills();
            if (typeof opts.onChange === 'function') opts.onChange(getSelected());
          });
        }
      }

      /* ── Checkbox click handlers ── */
      var items = scrollWrap.querySelectorAll('.cd-af-cb-item');
      for (var i = 0; i < items.length; i++) {
        items[i].addEventListener('click', function () {
          var uid = this.getAttribute('data-uid');
          if (selected[uid]) {
            delete selected[uid];
            this.classList.remove('cd-af-cb-checked');
          } else {
            selected[uid] = {
              name: this.getAttribute('data-name'),
              fine: parseFloat(this.getAttribute('data-fine')) || 0,
              category: this.getAttribute('data-cat')
            };
            this.classList.add('cd-af-cb-checked');
          }
          refreshPills();
          if (typeof opts.onChange === 'function') opts.onChange(getSelected());
        });
      }
    });

    function getSelected() {
      var arr = [];
      var keys = Object.keys(selected);
      for (var i = 0; i < keys.length; i++) arr.push(selected[keys[i]]);
      return arr;
    }

    return getSelected;
  }

  function formatCurrency(amount, currency) {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(amount);
    } catch (e) {
      return '$' + Number(amount).toFixed(2);
    }
  }

  /* ───────────────────────── Character Counter ───────────────────────── */

  function bindCharCounter(textareaId, counterId, max) {
    var ta = document.getElementById(textareaId);
    var ct = document.getElementById(counterId);
    if (!ta || !ct) return;

    function update() {
      var len = ta.value.length;
      ct.textContent = len + ' / ' + max;
      ct.className = 'cd-af-char-count' +
        (len > max ? ' cd-af-char-over' : (len > max * 0.85 ? ' cd-af-char-warn' : ''));
    }
    ta.addEventListener('input', update);
    update();
  }

  /* ───────────────────────── 1. Citation Form ───────────────────────── */

  function showCitationForm(civId, civName, callback) {
    activeCallback = callback || null;

    var body =
      '<div class="cd-af-section">Violations</div>' +
      '<div id="cd-af-cit-violations"></div>' +
      '<div class="cd-af-total-fine">' +
        '<span class="cd-af-total-fine-label">Total Fine</span>' +
        '<span class="cd-af-total-fine-amount" id="cd-af-cit-total">$0.00</span>' +
      '</div>' +
      '<div class="cd-af-field" style="margin-top:16px">' +
        '<label class="cd-af-label" for="cd-af-cit-notes">Notes (optional)</label>' +
        '<textarea id="cd-af-cit-notes" class="cd-af-textarea" placeholder="Additional notes..."></textarea>' +
      '</div>';

    var footer =
      '<button type="button" class="cd-af-btn-cancel">Cancel</button>' +
      '<button type="button" class="cd-af-btn-submit" data-label="Issue Citation">Issue Citation</button>';

    openPanel('fa-file-alt', 'Issue Citation', civName, body, footer);

    var getSelected = renderViolations('cd-af-cit-violations', {
      showFines: true,
      onChange: function (sel) {
        var total = 0;
        for (var i = 0; i < sel.length; i++) total += sel[i].fine;
        var el = document.getElementById('cd-af-cit-total');
        if (el) el.textContent = formatCurrency(total, (penalCodesCache && penalCodesCache.currency) || 'USD');
      }
    });

    /* Button handlers */
    var panel = document.getElementById('cd-af-panel');
    panel.querySelector('.cd-af-btn-cancel').addEventListener('click', closePanel);
    panel.querySelector('.cd-af-btn-submit').addEventListener('click', function () {
      clearPanelError();
      var sel = getSelected();
      if (!sel.length) { showPanelError('Select at least one violation'); return; }
      if (submitting) return;

      var fines = [];
      for (var i = 0; i < sel.length; i++) {
        fines.push({ fineType: sel[i].name, fineAmount: sel[i].fine, category: sel[i].category });
      }

      var c = cfg();
      var payload = {
        officerID: c.userId,
        type: 'Citation',
        fines: fines,
        notes: (document.getElementById('cd-af-cit-notes').value || '').trim(),
        date: todayStr(),
        departmentId: c.departmentId
      };

      setSubmitting(true);
      $.ajax({
        url: apiUrl() + '/api/v1/civilian/' + encodeURIComponent(civId) + '/criminal-history',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload),
        success: function () {
          toast('Citation issued successfully', 'success');
          if (typeof loadMyRankProgress === 'function') loadMyRankProgress();
          var cb = activeCallback;
          closePanel();
          if (typeof cb === 'function') cb();
        },
        error: function (xhr) {
          var msg = 'Failed to issue citation';
          try { var body = JSON.parse(xhr.responseText); msg = (body.response && body.response.message) || body.message || msg; } catch (e) {}
          showPanelError(msg);
          setSubmitting(false);
        }
      });
    });
  }

  /* ───────────────────────── 2. Warning Form ───────────────────────── */

  function showWarningForm(civId, civName, callback) {
    activeCallback = callback || null;

    var body =
      '<div class="cd-af-field">' +
        '<label class="cd-af-label" for="cd-af-warn-reason">Warning Reason <span style="color:var(--cd-red,#ef4444)">*</span></label>' +
        '<textarea id="cd-af-warn-reason" class="cd-af-textarea" placeholder="Describe the reason for this warning..." required style="min-height:120px"></textarea>' +
      '</div>';

    var footer =
      '<button type="button" class="cd-af-btn-cancel">Cancel</button>' +
      '<button type="button" class="cd-af-btn-submit" data-label="Issue Warning">Issue Warning</button>';

    openPanel('fa-exclamation-triangle', 'Issue Warning', civName, body, footer);

    var panel = document.getElementById('cd-af-panel');
    panel.querySelector('.cd-af-btn-cancel').addEventListener('click', closePanel);
    panel.querySelector('.cd-af-btn-submit').addEventListener('click', function () {
      clearPanelError();
      var reason = (document.getElementById('cd-af-warn-reason').value || '').trim();
      if (!reason) { showPanelError('Warning reason is required'); return; }
      if (submitting) return;

      var c = cfg();
      var payload = {
        officerID: c.userId,
        type: 'Warning',
        fines: [],
        notes: reason,
        date: todayStr(),
        departmentId: c.departmentId
      };

      setSubmitting(true);
      $.ajax({
        url: apiUrl() + '/api/v1/civilian/' + encodeURIComponent(civId) + '/criminal-history',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload),
        success: function () {
          toast('Warning issued successfully', 'success');
          if (typeof loadMyRankProgress === 'function') loadMyRankProgress();
          var cb = activeCallback;
          closePanel();
          if (typeof cb === 'function') cb();
        },
        error: function (xhr) {
          var msg = 'Failed to issue warning';
          try { var body = JSON.parse(xhr.responseText); msg = (body.response && body.response.message) || body.message || msg; } catch (e) {}
          showPanelError(msg);
          setSubmitting(false);
        }
      });
    });
  }

  /* ───────────────────────── 3. Arrest Report Form ───────────────────────── */

  function showArrestForm(civId, civName, civData, callback) {
    activeCallback = callback || null;
    civData = civData || {};

    var reportNum = genReportNumber();
    var today = todayStr();
    var now = nowTimeStr();

    var body =
      '<div class="cd-af-field">' +
        '<label class="cd-af-label" for="cd-af-arr-report">Report #</label>' +
        '<input id="cd-af-arr-report" class="cd-af-input" type="text" value="' + reportNum + '" readonly />' +
      '</div>' +

      '<div class="cd-af-section">Arrest Details</div>' +
      '<div class="cd-af-grid">' +
        '<div class="cd-af-field">' +
          '<label class="cd-af-label" for="cd-af-arr-date">Arrest Date</label>' +
          '<input id="cd-af-arr-date" class="cd-af-input" type="date" value="' + today + '" />' +
        '</div>' +
        '<div class="cd-af-field">' +
          '<label class="cd-af-label" for="cd-af-arr-time">Arrest Time</label>' +
          '<input id="cd-af-arr-time" class="cd-af-input" type="time" value="' + now + '" />' +
        '</div>' +
      '</div>' +
      '<div class="cd-af-field">' +
        '<label class="cd-af-label" for="cd-af-arr-loc">Arrest Location <span style="color:var(--cd-red,#ef4444)">*</span></label>' +
        '<input id="cd-af-arr-loc" class="cd-af-input" type="text" placeholder="e.g. 123 Main St" />' +
      '</div>' +

      '<div class="cd-af-grid">' +
        '<div class="cd-af-field">' +
          '<label class="cd-af-label" for="cd-af-arr-idate">Incident Date</label>' +
          '<input id="cd-af-arr-idate" class="cd-af-input" type="date" value="' + today + '" />' +
        '</div>' +
        '<div class="cd-af-field">' +
          '<label class="cd-af-label" for="cd-af-arr-itime">Incident Time</label>' +
          '<input id="cd-af-arr-itime" class="cd-af-input" type="time" />' +
        '</div>' +
      '</div>' +
      '<div class="cd-af-field">' +
        '<label class="cd-af-label" for="cd-af-arr-iloc">Incident Location</label>' +
        '<input id="cd-af-arr-iloc" class="cd-af-input" type="text" placeholder="e.g. Highway 101" />' +
      '</div>' +

      '<div class="cd-af-section">Charges</div>' +
      '<div id="cd-af-arr-violations"></div>' +

      '<div class="cd-af-section">Force Used?</div>' +
      '<div class="cd-af-field">' +
        '<div class="cd-af-toggle-wrap" id="cd-af-arr-force-wrap">' +
          '<button type="button" class="cd-af-toggle-btn" data-val="false" data-active="true">No</button>' +
          '<button type="button" class="cd-af-toggle-btn" data-val="true">Yes</button>' +
        '</div>' +
      '</div>' +

      '<div class="cd-af-section">Narrative</div>' +
      '<div class="cd-af-field">' +
        '<label class="cd-af-label" for="cd-af-arr-narrative">Narrative <span style="color:var(--cd-red,#ef4444)">*</span></label>' +
        '<textarea id="cd-af-arr-narrative" class="cd-af-textarea" maxlength="500" placeholder="Describe the events leading to the arrest..." style="min-height:100px"></textarea>' +
        '<div id="cd-af-arr-narrative-count" class="cd-af-char-count">0 / 500</div>' +
      '</div>' +

      '<div class="cd-af-field">' +
        '<label class="cd-af-label" for="cd-af-arr-witnesses">Actions Taken / Witnesses</label>' +
        '<textarea id="cd-af-arr-witnesses" class="cd-af-textarea" maxlength="500" placeholder="List any witnesses or additional actions taken..."></textarea>' +
        '<div id="cd-af-arr-witnesses-count" class="cd-af-char-count">0 / 500</div>' +
      '</div>';

    var footer =
      '<button type="button" class="cd-af-btn-cancel">Cancel</button>' +
      '<button type="button" class="cd-af-btn-submit cd-af-btn-danger" data-label="Submit Arrest Report">Submit Arrest Report</button>';

    openPanel('fa-gavel', 'Create Arrest Report', civName, body, footer);

    /* Violations */
    var getSelected = renderViolations('cd-af-arr-violations', { showFines: false });

    /* Character counters */
    bindCharCounter('cd-af-arr-narrative', 'cd-af-arr-narrative-count', 500);
    bindCharCounter('cd-af-arr-witnesses', 'cd-af-arr-witnesses-count', 500);

    /* Force toggle */
    var forceUsed = false;
    var forceWrap = document.getElementById('cd-af-arr-force-wrap');
    if (forceWrap) {
      /* Set initial state */
      forceWrap.querySelector('[data-val="false"]').classList.add('cd-af-toggle-active');

      var toggleBtns = forceWrap.querySelectorAll('.cd-af-toggle-btn');
      for (var i = 0; i < toggleBtns.length; i++) {
        toggleBtns[i].addEventListener('click', function () {
          forceUsed = this.getAttribute('data-val') === 'true';
          var btns = forceWrap.querySelectorAll('.cd-af-toggle-btn');
          for (var j = 0; j < btns.length; j++) btns[j].classList.remove('cd-af-toggle-active');
          this.classList.add('cd-af-toggle-active');
        });
      }
    }

    /* Button handlers */
    var panel = document.getElementById('cd-af-panel');
    panel.querySelector('.cd-af-btn-cancel').addEventListener('click', closePanel);
    panel.querySelector('.cd-af-btn-submit').addEventListener('click', function () {
      clearPanelError();
      var arrestLoc = (document.getElementById('cd-af-arr-loc').value || '').trim();
      var narrative = (document.getElementById('cd-af-arr-narrative').value || '').trim();
      var sel = getSelected();

      var errors = [];
      if (!arrestLoc) errors.push('Arrest location');
      if (!sel.length) errors.push('At least one charge');
      if (!narrative) errors.push('Narrative');
      if (narrative && narrative.length > 500) errors.push('Narrative exceeds 500 characters');

      var witnesses = (document.getElementById('cd-af-arr-witnesses').value || '').trim();
      if (witnesses.length > 500) errors.push('Witnesses exceeds 500 characters');

      if (errors.length) {
        showPanelError('Required: ' + errors.join(', '));
        return;
      }
      if (submitting) return;

      var chargeNames = [];
      for (var i = 0; i < sel.length; i++) chargeNames.push(sel[i].name);

      var c = cfg();
      var dbUser = c.dbUser || {};

      var payload = {
        arrestReport: {
          reportNumber: String(reportNum),
          arrestDate: document.getElementById('cd-af-arr-date').value || today,
          arrestTime: document.getElementById('cd-af-arr-time').value || now,
          arrestLocation: arrestLoc,
          incidentDate: document.getElementById('cd-af-arr-idate').value || today,
          incidentTime: document.getElementById('cd-af-arr-itime').value || '',
          incidentLocation: (document.getElementById('cd-af-arr-iloc').value || '').trim(),
          arrestee: {
            id: civId,
            name: civName,
            dob: civData.birthday || civData.dob || '',
            address: civData.address || '',
            height: civData.height || '',
            weight: civData.weight || '',
            eyeColor: civData.eyeColor || '',
            hairColor: civData.hairColor || ''
          },
          officer: {
            name: c.userName || '',
            badgeNumber: dbUser.callSign || ''
          },
          charges: chargeNames.join(', '),
          narrative: narrative,
          witnesses: witnesses,
          forceUsed: forceUsed,
          officerID: c.userId,
          departmentId: c.departmentId,
          activeCommunityID: c.communityId
        }
      };

      setSubmitting(true);
      $.ajax({
        url: apiUrl() + '/api/v1/arrest-report',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload),
        success: function () {
          toast('Arrest report submitted successfully', 'success');
          if (typeof loadMyRankProgress === 'function') loadMyRankProgress();
          var cb = activeCallback;
          closePanel();
          if (typeof cb === 'function') cb();
        },
        error: function (xhr) {
          var msg = 'Failed to submit arrest report';
          try { var body = JSON.parse(xhr.responseText); msg = (body.response && body.response.message) || body.message || msg; } catch (e) {}
          showPanelError(msg);
          setSubmitting(false);
        }
      });
    });
  }

  /* ───────────────────────── 4. Warrant Form ───────────────────────── */

  function showWarrantForm(civId, civName, callback) {
    activeCallback = callback || null;

    var body =
      '<div class="cd-af-field">' +
        '<label class="cd-af-label" for="cd-af-war-type">Warrant Type</label>' +
        '<select id="cd-af-war-type" class="cd-af-select">' +
          '<option value="arrest" selected>Arrest Warrant</option>' +
          '<option value="search">Search Warrant</option>' +
          '<option value="bench">Bench Warrant</option>' +
        '</select>' +
      '</div>' +

      '<div class="cd-af-section">Charges</div>' +
      '<div id="cd-af-war-violations"></div>' +

      '<div class="cd-af-field" style="margin-top:16px">' +
        '<label class="cd-af-label" for="cd-af-war-cause">Probable Cause <span style="color:var(--cd-red,#ef4444)">*</span></label>' +
        '<textarea id="cd-af-war-cause" class="cd-af-textarea" placeholder="Describe the probable cause for this warrant..." style="min-height:100px"></textarea>' +
      '</div>' +

      '<div class="cd-af-field" id="cd-af-war-search-field" style="display:none">' +
        '<label class="cd-af-label" for="cd-af-war-search-loc">Search Location <span style="color:var(--cd-red,#ef4444)">*</span></label>' +
        '<input id="cd-af-war-search-loc" class="cd-af-input" type="text" placeholder="e.g. 456 Oak Ave, Apt 2B" />' +
      '</div>';

    var footer =
      '<button type="button" class="cd-af-btn-cancel">Cancel</button>' +
      '<button type="button" class="cd-af-btn-submit" data-label="Request Warrant">Request Warrant</button>';

    openPanel('fa-file-contract', 'Request Warrant', civName, body, footer);

    /* Violations */
    var getSelected = renderViolations('cd-af-war-violations', { showFines: false });

    /* Toggle search location visibility */
    var typeSelect = document.getElementById('cd-af-war-type');
    var searchField = document.getElementById('cd-af-war-search-field');
    if (typeSelect && searchField) {
      typeSelect.addEventListener('change', function () {
        searchField.style.display = this.value === 'search' ? '' : 'none';
      });
    }

    /* Button handlers */
    var panel = document.getElementById('cd-af-panel');
    panel.querySelector('.cd-af-btn-cancel').addEventListener('click', closePanel);
    panel.querySelector('.cd-af-btn-submit').addEventListener('click', function () {
      clearPanelError();
      var warrantType = typeSelect.value;
      var cause = (document.getElementById('cd-af-war-cause').value || '').trim();
      var searchLoc = (document.getElementById('cd-af-war-search-loc').value || '').trim();
      var sel = getSelected();

      var errors = [];
      if (!sel.length) errors.push('At least one charge');
      if (!cause) errors.push('Probable cause');
      if (warrantType === 'search' && !searchLoc) errors.push('Search location');
      if (errors.length) { showPanelError('Required: ' + errors.join(', ')); return; }
      if (submitting) return;

      /* Split civilian name into first/last */
      var nameParts = civName.trim().split(/\s+/);
      var firstName = nameParts[0] || '';
      var lastName = nameParts.slice(1).join(' ') || '';

      var charges = [];
      for (var i = 0; i < sel.length; i++) charges.push(sel[i].name);

      var c = cfg();
      var payload = {
        warrantType: warrantType,
        accusedID: civId,
        accusedFirstName: firstName,
        accusedLastName: lastName,
        charges: charges,
        probableCause: cause,
        searchLocation: searchLoc,
        requestingOfficerID: c.userId,
        requestingOfficerName: c.userName || '',
        activeCommunityID: c.communityId
      };

      setSubmitting(true);
      $.ajax({
        url: apiUrl() + '/api/v1/warrant',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload),
        success: function () {
          toast('Warrant request submitted successfully', 'success');
          var cb = activeCallback;
          closePanel();
          if (typeof cb === 'function') cb();
        },
        error: function (xhr) {
          var msg = 'Failed to submit warrant request';
          try { var body = JSON.parse(xhr.responseText); msg = (body.response && body.response.message) || body.message || msg; } catch (e) {}
          showPanelError(msg);
          setSubmitting(false);
        }
      });
    });
  }

  /* ───────────────────────── Public API ───────────────────────── */

  window.cdShowCitationForm = showCitationForm;
  window.cdShowWarningForm = showWarningForm;
  window.cdShowArrestForm = showArrestForm;
  window.cdShowWarrantForm = showWarrantForm;
  window.cdCloseActionForm = closePanel;

})();
