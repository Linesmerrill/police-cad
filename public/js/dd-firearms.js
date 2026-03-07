/**
 * Department Dashboard — Firearms Component
 *
 * Registers window.ddFirearmRender and window.ddFirearmInit for the
 * department dashboard component registry.
 *
 * Dependencies (provided by the host page):
 *   - jQuery ($)
 *   - window.ddConfig  { API_URL, communityId, userId, dbUser }
 *   - window.esc()     HTML-escape helper
 *   - window.ddToast() Toast notification helper
 *   - window.ddModal() Unified modal helper
 */
;(function () {
  'use strict';

  /* ───────────────────────── constants / state ───────────────────────── */

  var PAGE_SIZE = window.innerWidth <= 600 ? 6 : 12;
  var DEBOUNCE_MS = 300;

  var state = {
    firearms: [],
    page: 0,
    totalCount: 0,
    searchQuery: '',
    loading: false,
    saving: false,
    deleting: false
  };

  var searchTimer = null;
  var detailModalCreated = false;
  var newModalCreated = false;

  /* ──────────────────────── helper — config access ───────────────────── */

  function cfg() {
    return window.ddConfig || {};
  }

  function apiUrl() {
    return cfg().API_URL || '';
  }

  /* ──────────────────────── helper — boolean normalize ────────────────── */

  /** Normalize API boolean (1, "1", "true", true → true; else false). */
  function toBool(v) {
    if (v === true || v === 1 || v === '1' || v === 'true') return true;
    return false;
  }

  /** Convert boolean to the string value the API expects. */
  function boolToApi(v) {
    return v ? '1' : '2';
  }

  /* ──────────────────────── helper — flatten firearm ──────────────────── */

  /**
   * API responses may wrap details in { _id, firearm: { ... } }.
   * Flatten to a single object with _id at the top level.
   */
  function flatten(item) {
    if (!item) return null;
    var details = item.firearm || item;
    return {
      _id: item._id || details._id || '',
      serialNumber: details.serialNumber || '',
      name: details.name || '',
      weaponType: details.weaponType || '',
      caliber: details.caliber || '',
      color: details.color || '',
      isStolen: toBool(details.isStolen),
      image: details.image || '',
      userID: details.userID || '',
      activeCommunityID: details.activeCommunityID || '',
      createdAt: details.createdAt || '',
      updatedAt: details.updatedAt || ''
    };
  }

  /** Normalize an API response into an array of flattened firearms. */
  function normalizeList(data) {
    var raw = [];
    if (Array.isArray(data)) {
      raw = data;
    } else if (data && Array.isArray(data.firearms)) {
      raw = data.firearms;
    } else if (data && Array.isArray(data.data)) {
      raw = data.data;
    } else if (data && Array.isArray(data.items)) {
      raw = data.items;
    }
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var f = flatten(raw[i]);
      if (f) out.push(f);
    }
    return out;
  }

  /** Extract total count from API response. */
  function extractTotal(data) {
    if (data && typeof data.totalCount === 'number') return data.totalCount;
    if (data && typeof data.total === 'number') return data.total;
    return 0;
  }

  /* ──────────────────────── helper — serial generator ────────────────── */

  function generateSerial() {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var result = '';
    for (var i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /* ───────────────────────── inject shared modal CSS ─────────────────── */

  function injectSharedModalStyles() {
    if (document.getElementById('dd-shared-modal-styles')) return;
    var css =
      '.dd-civ-new-overlay{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity 0.25s;}' +
      '.dd-civ-new-overlay.dd-civ-visible{opacity:1;pointer-events:auto;}' +
      '.dd-civ-new-panel{background:var(--dd-surface,#13131a);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius);width:94vw;max-width:560px;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.5);}' +
      '.dd-civ-new-header{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;border-bottom:1px solid var(--dd-glass-border);}' +
      '.dd-civ-new-title{font-size:1rem;font-weight:700;color:#fff;}' +
      '.dd-civ-new-body{flex:1;overflow-y:auto;padding:1.25rem;}' +
      '.dd-civ-new-footer{display:flex;justify-content:flex-end;gap:0.5rem;padding:0.75rem 1.25rem;border-top:1px solid var(--dd-glass-border);}' +
      '.dd-civ-close{background:none;border:none;color:var(--dd-text-muted);font-size:1.125rem;cursor:pointer;padding:0.25rem;transition:color 0.2s;line-height:1;}' +
      '.dd-civ-close:hover{color:var(--dd-text);}' +
      '.dd-civ-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:0.75rem 0.75rem;}' +
      '.dd-civ-field{display:flex;flex-direction:column;gap:0.25rem;}' +
      '.dd-civ-field label{font-size:0.6875rem;font-weight:500;color:var(--dd-text-muted);text-transform:uppercase;letter-spacing:0.04em;}' +
      '.dd-civ-field input[type="text"],.dd-civ-field select,.dd-civ-field textarea{background:rgba(255,255,255,0.05);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius-sm,8px);padding:0.45rem 0.6rem;color:var(--dd-text);font-size:0.8125rem;outline:none;transition:border-color 0.2s;font-family:inherit;}' +
      '.dd-civ-field input:focus,.dd-civ-field select:focus,.dd-civ-field textarea:focus{border-color:var(--dd-accent);}' +
      '.dd-civ-checkbox-row{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:0.75rem 1.25rem;padding:0.25rem 0;}' +
      '.dd-civ-checkbox{display:flex;align-items:center;gap:0.4rem;font-size:0.8125rem;color:var(--dd-text);cursor:pointer;}' +
      '.dd-civ-checkbox input{accent-color:var(--dd-accent);width:15px;height:15px;cursor:pointer;}' +
      '.dd-civ-btn{border:none;border-radius:var(--dd-radius-sm,8px);padding:0.5rem 1rem;font-size:0.8125rem;font-weight:500;cursor:pointer;transition:all 0.2s;font-family:inherit;display:inline-flex;align-items:center;gap:0.35rem;}' +
      '.dd-civ-btn-primary{background:var(--dd-accent);color:#fff;}.dd-civ-btn-primary:hover{filter:brightness(1.15);}' +
      '.dd-civ-btn-secondary{background:rgba(255,255,255,0.08);color:var(--dd-text);}.dd-civ-btn-secondary:hover{background:rgba(255,255,255,0.12);}' +
      '.dd-civ-btn-danger{background:rgba(239,68,68,0.15);color:#fca5a5;}.dd-civ-btn-danger:hover{background:rgba(239,68,68,0.25);}' +
      '.dd-civ-btn-small{padding:0.35rem 0.7rem;font-size:0.75rem;}' +
      '.dd-civ-photo-upload{position:relative;display:inline-block;cursor:pointer;}' +
      '.dd-civ-photo-upload input[type="file"]{display:none;}' +
      '.dd-civ-photo-overlay{position:absolute;inset:0;border-radius:8px;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.2s;}' +
      '.dd-civ-photo-upload:hover .dd-civ-photo-overlay{opacity:1;}' +
      '.dd-civ-photo-overlay i{color:#fff;font-size:0.75rem;}' +
      '@media(max-width:600px){' +
        '.dd-civ-form-grid{grid-template-columns:1fr;}' +
        '.dd-civ-new-panel{width:100vw;max-width:100vw;max-height:100vh;height:100vh;border-radius:0;}' +
      '}';
    var style = document.createElement('style');
    style.id = 'dd-shared-modal-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ───────────────────────── inject component CSS ────────────────────── */

  function injectStyles() {
    if (document.getElementById('dd-fa-styles')) return;
    injectSharedModalStyles();
    var css =
      /* ── Grid ── */
      '.dd-fa-grid {' +
        'display: grid;' +
        'grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));' +
        'gap: 0.875rem;' +
      '}' +

      /* ── Search bar ── */
      '.dd-fa-toolbar {' +
        'display: flex;' +
        'align-items: center;' +
        'gap: 0.625rem;' +
        'flex-wrap: wrap;' +
      '}' +
      '.dd-fa-search-wrap {' +
        'position: relative;' +
        'flex: 1;' +
        'min-width: 160px;' +
      '}' +
      '.dd-fa-search-wrap i {' +
        'position: absolute;' +
        'left: 0.625rem;' +
        'top: 50%;' +
        'transform: translateY(-50%);' +
        'color: var(--dd-text-dim);' +
        'font-size: 0.75rem;' +
        'pointer-events: none;' +
      '}' +
      '.dd-fa-search {' +
        'width: 100%;' +
        'padding: 0.5rem 0.625rem 0.5rem 2rem;' +
        'border-radius: var(--dd-radius-sm);' +
        'border: 1px solid var(--dd-glass-border);' +
        'background: var(--dd-glass);' +
        'color: var(--dd-text);' +
        'font-family: inherit;' +
        'font-size: 0.8125rem;' +
        'outline: none;' +
        'transition: border-color 0.2s;' +
      '}' +
      '.dd-fa-search:focus {' +
        'border-color: rgba(255,255,255,0.15);' +
      '}' +
      '.dd-fa-search::placeholder {' +
        'color: var(--dd-text-dim);' +
      '}' +

      /* ── Add button ── */
      '.dd-fa-add-btn {' +
        'padding: 0.5rem 0.875rem;' +
        'border-radius: var(--dd-radius-sm);' +
        'border: 1px solid rgba(239,68,68,0.25);' +
        'background: rgba(239,68,68,0.1);' +
        'color: #fca5a5;' +
        'font-family: inherit;' +
        'font-size: 0.75rem;' +
        'font-weight: 500;' +
        'cursor: pointer;' +
        'transition: all 0.2s;' +
        'white-space: nowrap;' +
        'display: inline-flex;' +
        'align-items: center;' +
        'gap: 0.375rem;' +
      '}' +
      '.dd-fa-add-btn:hover {' +
        'background: rgba(239,68,68,0.18);' +
        'border-color: rgba(239,68,68,0.4);' +
        'color: #fecaca;' +
      '}' +

      /* ── Card ── */
      '.dd-fa-card {' +
        'background: var(--dd-glass);' +
        'border: 1px solid var(--dd-glass-border);' +
        'border-radius: var(--dd-radius);' +
        'padding: 1rem;' +
        'cursor: pointer;' +
        'transition: all 0.2s;' +
        'display: flex;' +
        'flex-direction: column;' +
        'gap: 0.625rem;' +
        'position: relative;' +
        'overflow: hidden;' +
      '}' +
      '.dd-fa-card:hover {' +
        'background: rgba(255,255,255,0.06);' +
        'border-color: rgba(255,255,255,0.12);' +
        'transform: translateY(-2px);' +
      '}' +

      /* Card icon / image */
      '.dd-fa-card-icon {' +
        'width: 44px;' +
        'height: 44px;' +
        'border-radius: var(--dd-radius-sm);' +
        'background: rgba(239,68,68,0.1);' +
        'border: 1px solid rgba(239,68,68,0.15);' +
        'display: flex;' +
        'align-items: center;' +
        'justify-content: center;' +
        'font-size: 1.125rem;' +
        'color: #fca5a5;' +
        'flex-shrink: 0;' +
        'overflow: hidden;' +
      '}' +
      '.dd-fa-card-icon img {' +
        'width: 100%;' +
        'height: 100%;' +
        'object-fit: cover;' +
      '}' +

      /* Card text */
      '.dd-fa-card-title {' +
        'font-size: 0.8125rem;' +
        'font-weight: 600;' +
        'color: var(--dd-text);' +
        'margin: 0;' +
        'white-space: nowrap;' +
        'overflow: hidden;' +
        'text-overflow: ellipsis;' +
      '}' +
      '.dd-fa-card-meta {' +
        'font-size: 0.6875rem;' +
        'color: var(--dd-text-muted);' +
        'margin: 0;' +
        'white-space: nowrap;' +
        'overflow: hidden;' +
        'text-overflow: ellipsis;' +
      '}' +

      /* Stolen badge */
      '.dd-fa-stolen-badge {' +
        'display: inline-flex;' +
        'align-items: center;' +
        'gap: 0.25rem;' +
        'padding: 0.125rem 0.5rem;' +
        'border-radius: 9999px;' +
        'background: rgba(239,68,68,0.15);' +
        'color: var(--dd-red);' +
        'font-size: 0.625rem;' +
        'font-weight: 600;' +
        'letter-spacing: 0.03em;' +
        'text-transform: uppercase;' +
      '}' +

      /* ── Pagination ── */
      '.dd-fa-pagination {' +
        'display: flex;' +
        'align-items: center;' +
        'justify-content: center;' +
        'gap: 0.75rem;' +
        'margin-top: 1rem;' +
        'padding-top: 1rem;' +
        'border-top: 1px solid var(--dd-glass-border);' +
      '}' +
      '.dd-fa-page-btn {' +
        'padding: 0.375rem 0.75rem;' +
        'border-radius: var(--dd-radius-sm);' +
        'font-family: inherit;' +
        'font-size: 0.75rem;' +
        'font-weight: 500;' +
        'border: 1px solid var(--dd-glass-border);' +
        'background: var(--dd-glass);' +
        'color: var(--dd-text-muted);' +
        'cursor: pointer;' +
        'transition: all 0.15s ease;' +
      '}' +
      '.dd-fa-page-btn:hover:not(:disabled) {' +
        'background: rgba(255,255,255,0.07);' +
        'color: var(--dd-text);' +
      '}' +
      '.dd-fa-page-btn:disabled {' +
        'opacity: 0.3;' +
        'cursor: not-allowed;' +
      '}' +
      '.dd-fa-page-info {' +
        'font-size: 0.75rem;' +
        'color: var(--dd-text-muted);' +
      '}' +

      /* ── Modal overlay (detail + new) ── */
      '.dd-fa-modal-overlay {' +
        'position: fixed;' +
        'inset: 0;' +
        'z-index: 9000;' +
        'background: rgba(0,0,0,0.6);' +
        'backdrop-filter: blur(6px);' +
        '-webkit-backdrop-filter: blur(6px);' +
        'display: none;' +
        'align-items: center;' +
        'justify-content: center;' +
        'padding: 1.5rem;' +
      '}' +
      '.dd-fa-modal-overlay.visible {' +
        'display: flex;' +
      '}' +

      /* Modal panel */
      '.dd-fa-modal-panel {' +
        'background: rgba(15,17,23,0.95);' +
        'backdrop-filter: blur(24px);' +
        '-webkit-backdrop-filter: blur(24px);' +
        'border: 1px solid var(--dd-glass-border);' +
        'border-radius: var(--dd-radius);' +
        'width: 100%;' +
        'max-width: 480px;' +
        'max-height: 90vh;' +
        'overflow-y: auto;' +
        'box-shadow: 0 25px 60px rgba(0,0,0,0.5);' +
      '}' +

      /* Modal header */
      '.dd-fa-modal-header {' +
        'display: flex;' +
        'align-items: center;' +
        'justify-content: space-between;' +
        'padding: 1rem 1.25rem;' +
        'border-bottom: 1px solid var(--dd-glass-border);' +
      '}' +
      '.dd-fa-modal-title {' +
        'font-size: 0.9375rem;' +
        'font-weight: 600;' +
        'color: var(--dd-text);' +
        'margin: 0;' +
        'display: flex;' +
        'align-items: center;' +
        'gap: 0.5rem;' +
      '}' +
      '.dd-fa-modal-close {' +
        'background: none;' +
        'border: none;' +
        'color: var(--dd-text-muted);' +
        'font-size: 1rem;' +
        'cursor: pointer;' +
        'padding: 0.25rem;' +
        'transition: color 0.15s;' +
      '}' +
      '.dd-fa-modal-close:hover {' +
        'color: var(--dd-text);' +
      '}' +

      /* Modal body */
      '.dd-fa-modal-body {' +
        'padding: 1.25rem;' +
        'display: flex;' +
        'flex-direction: column;' +
        'gap: 0.875rem;' +
      '}' +

      /* Form group */
      '.dd-fa-form-group {' +
        'display: flex;' +
        'flex-direction: column;' +
        'gap: 0.3125rem;' +
      '}' +
      '.dd-fa-form-label {' +
        'font-size: 0.6875rem;' +
        'font-weight: 500;' +
        'color: var(--dd-text-muted);' +
        'text-transform: uppercase;' +
        'letter-spacing: 0.04em;' +
      '}' +
      '.dd-fa-form-input {' +
        'padding: 0.5rem 0.625rem;' +
        'border-radius: var(--dd-radius-sm);' +
        'border: 1px solid var(--dd-glass-border);' +
        'background: var(--dd-glass);' +
        'color: var(--dd-text);' +
        'font-family: inherit;' +
        'font-size: 0.8125rem;' +
        'outline: none;' +
        'transition: border-color 0.2s;' +
      '}' +
      '.dd-fa-form-input:focus {' +
        'border-color: rgba(255,255,255,0.15);' +
      '}' +
      '.dd-fa-form-input::placeholder {' +
        'color: var(--dd-text-dim);' +
      '}' +

      /* Serial inline row */
      '.dd-fa-serial-row {' +
        'display: flex;' +
        'gap: 0.5rem;' +
      '}' +
      '.dd-fa-serial-row .dd-fa-form-input {' +
        'flex: 1;' +
      '}' +
      '.dd-fa-gen-btn {' +
        'padding: 0.5rem 0.625rem;' +
        'border-radius: var(--dd-radius-sm);' +
        'border: 1px solid var(--dd-glass-border);' +
        'background: var(--dd-glass);' +
        'color: var(--dd-text-muted);' +
        'font-size: 0.75rem;' +
        'cursor: pointer;' +
        'transition: all 0.15s;' +
        'white-space: nowrap;' +
      '}' +
      '.dd-fa-gen-btn:hover {' +
        'background: rgba(255,255,255,0.07);' +
        'color: var(--dd-text);' +
      '}' +

      /* Toggle switch */
      '.dd-fa-toggle-row {' +
        'display: flex;' +
        'align-items: center;' +
        'justify-content: space-between;' +
      '}' +
      '.dd-fa-toggle-label {' +
        'font-size: 0.8125rem;' +
        'color: var(--dd-text);' +
      '}' +
      '.dd-fa-toggle {' +
        'position: relative;' +
        'width: 40px;' +
        'height: 22px;' +
        'cursor: pointer;' +
      '}' +
      '.dd-fa-toggle input {' +
        'opacity: 0;' +
        'width: 0;' +
        'height: 0;' +
      '}' +
      '.dd-fa-toggle-track {' +
        'position: absolute;' +
        'inset: 0;' +
        'border-radius: 11px;' +
        'background: rgba(255,255,255,0.1);' +
        'transition: background 0.2s;' +
      '}' +
      '.dd-fa-toggle input:checked + .dd-fa-toggle-track {' +
        'background: rgba(239,68,68,0.45);' +
      '}' +
      '.dd-fa-toggle-thumb {' +
        'position: absolute;' +
        'top: 3px;' +
        'left: 3px;' +
        'width: 16px;' +
        'height: 16px;' +
        'border-radius: 50%;' +
        'background: #fff;' +
        'transition: transform 0.2s;' +
      '}' +
      '.dd-fa-toggle input:checked ~ .dd-fa-toggle-thumb {' +
        'transform: translateX(18px);' +
      '}' +

      /* Modal footer */
      '.dd-fa-modal-footer {' +
        'display: flex;' +
        'align-items: center;' +
        'justify-content: space-between;' +
        'padding: 0.875rem 1.25rem;' +
        'border-top: 1px solid var(--dd-glass-border);' +
        'gap: 0.5rem;' +
      '}' +

      /* Action buttons */
      '.dd-fa-btn-save {' +
        'padding: 0.5rem 1rem;' +
        'border-radius: var(--dd-radius-sm);' +
        'border: none;' +
        'background: rgba(139,92,246,0.25);' +
        'color: #c4b5fd;' +
        'font-family: inherit;' +
        'font-size: 0.8125rem;' +
        'font-weight: 500;' +
        'cursor: pointer;' +
        'transition: all 0.2s;' +
        'display: inline-flex;' +
        'align-items: center;' +
        'gap: 0.375rem;' +
      '}' +
      '.dd-fa-btn-save:hover:not(:disabled) {' +
        'background: rgba(139,92,246,0.35);' +
        'color: #ddd6fe;' +
      '}' +
      '.dd-fa-btn-save:disabled {' +
        'opacity: 0.5;' +
        'cursor: not-allowed;' +
      '}' +
      '.dd-fa-btn-delete {' +
        'padding: 0.5rem 0.75rem;' +
        'border-radius: var(--dd-radius-sm);' +
        'border: 1px solid rgba(239,68,68,0.2);' +
        'background: transparent;' +
        'color: var(--dd-red);' +
        'font-family: inherit;' +
        'font-size: 0.75rem;' +
        'cursor: pointer;' +
        'transition: all 0.2s;' +
        'display: inline-flex;' +
        'align-items: center;' +
        'gap: 0.375rem;' +
      '}' +
      '.dd-fa-btn-delete:hover:not(:disabled) {' +
        'background: rgba(239,68,68,0.1);' +
        'border-color: rgba(239,68,68,0.35);' +
      '}' +
      '.dd-fa-btn-delete:disabled {' +
        'opacity: 0.5;' +
        'cursor: not-allowed;' +
      '}' +
      '.dd-fa-btn-create {' +
        'padding: 0.5rem 1rem;' +
        'border-radius: var(--dd-radius-sm);' +
        'border: none;' +
        'background: rgba(239,68,68,0.2);' +
        'color: #fca5a5;' +
        'font-family: inherit;' +
        'font-size: 0.8125rem;' +
        'font-weight: 500;' +
        'cursor: pointer;' +
        'transition: all 0.2s;' +
        'display: inline-flex;' +
        'align-items: center;' +
        'gap: 0.375rem;' +
        'margin-left: auto;' +
      '}' +
      '.dd-fa-btn-create:hover:not(:disabled) {' +
        'background: rgba(239,68,68,0.3);' +
        'color: #fecaca;' +
      '}' +
      '.dd-fa-btn-create:disabled {' +
        'opacity: 0.5;' +
        'cursor: not-allowed;' +
      '}' +

      /* Photo upload */
      '.dd-fa-photo-section {' +
        'display: flex;' +
        'align-items: center;' +
        'gap: 1rem;' +
        'padding: 0 1.25rem;' +
        'padding-top: 1rem;' +
      '}' +
      '.dd-fa-photo-wrap {' +
        'width: 60px;' +
        'height: 60px;' +
        'border-radius: var(--dd-radius-sm, 8px);' +
        'overflow: hidden;' +
        'position: relative;' +
        'cursor: pointer;' +
        'flex-shrink: 0;' +
        'background: rgba(239,68,68,0.1);' +
        'display: flex;' +
        'align-items: center;' +
        'justify-content: center;' +
      '}' +
      '.dd-fa-photo-wrap img {' +
        'width: 100%;' +
        'height: 100%;' +
        'object-fit: cover;' +
      '}' +
      '.dd-fa-photo-wrap .dd-fa-photo-icon {' +
        'font-size: 1.5rem;' +
        'color: #fca5a5;' +
      '}' +
      '.dd-fa-photo-overlay {' +
        'position: absolute;' +
        'inset: 0;' +
        'background: rgba(0,0,0,0.4);' +
        'display: flex;' +
        'align-items: center;' +
        'justify-content: center;' +
        'opacity: 0;' +
        'transition: opacity 0.2s;' +
        'border-radius: inherit;' +
      '}' +
      '.dd-fa-photo-wrap:hover .dd-fa-photo-overlay {' +
        'opacity: 1;' +
      '}' +
      '.dd-fa-photo-overlay i {' +
        'color: #fff;' +
        'font-size: 0.9rem;' +
      '}' +
      '.dd-fa-photo-wrap input[type="file"] {' +
        'display: none;' +
      '}' +

      /* ── Responsive ── */
      '@media(max-width:600px){' +
        '.dd-fa-grid{grid-template-columns:1fr;gap:0.5rem;}' +
        '.dd-fa-toolbar{flex-direction:column;align-items:stretch;}' +
        '.dd-fa-search-wrap{min-width:0;}' +
      '}';

    var $style = $('<style id="dd-fa-styles"></style>').text(css);
    $('head').append($style);
  }

  /* ═════════════════════════════════════════════════════════════════════
     RENDER  —  returns the panel HTML string
     ═════════════════════════════════════════════════════════════════════ */

  function ddFirearmRender(/* key */) {
    return '' +
      '<div class="dd-card-header">' +
        '<div class="dd-card-header-left">' +
          '<div class="dd-card-icon" style="background:rgba(239,68,68,0.15);color:var(--dd-red);"><i class="fa fa-crosshairs"></i></div>' +
          '<div><h3 class="dd-card-title">Firearms</h3><p class="dd-card-subtitle">Manage registered firearms</p></div>' +
        '</div>' +
      '</div>' +
      '<div class="dd-card-body">' +
        '<div class="dd-fa-toolbar" style="margin-bottom:0.875rem;">' +
          '<div class="dd-fa-search-wrap">' +
            '<i class="fa fa-search"></i>' +
            '<input type="text" class="dd-fa-search" id="dd-fa-search" placeholder="Search by name, type, or serial..." autocomplete="off">' +
          '</div>' +
          '<button class="dd-fa-add-btn" id="dd-fa-add-btn"><i class="fa fa-plus"></i> Add New Firearm</button>' +
        '</div>' +
        '<div class="dd-fa-loading dd-spinner"></div>' +
        '<div class="dd-fa-empty dd-empty" style="display:none;">' +
          '<div class="dd-empty-icon-wrap" style="background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.15);">' +
            '<i class="fa fa-crosshairs" style="color:var(--dd-red);"></i>' +
          '</div>' +
          '<p class="dd-empty-title">No firearms found</p>' +
          '<p class="dd-empty-sub">Register your first firearm to get started</p>' +
        '</div>' +
        '<div id="dd-fa-grid" class="dd-fa-grid" style="display:none;"></div>' +
        '<div class="dd-fa-pagination" id="dd-fa-pagination" style="display:none;">' +
          '<button class="dd-fa-page-btn" id="dd-fa-prev"><i class="fa fa-chevron-left"></i> Prev</button>' +
          '<span class="dd-fa-page-info" id="dd-fa-page-info">Page 1 of 1</span>' +
          '<button class="dd-fa-page-btn" id="dd-fa-next">Next <i class="fa fa-chevron-right"></i></button>' +
        '</div>' +
      '</div>';
  }

  /* ═════════════════════════════════════════════════════════════════════
     INIT  —  bind events and load first page
     ═════════════════════════════════════════════════════════════════════ */

  function ddFirearmInit() {
    injectStyles();

    // Search — debounced
    $(document).off('input.ddfa', '#dd-fa-search').on('input.ddfa', '#dd-fa-search', function () {
      var val = $(this).val().trim();
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        state.searchQuery = val;
        state.page = 0;
        loadFirearms();
      }, DEBOUNCE_MS);
    });

    // Add New button
    $(document).off('click.ddfa', '#dd-fa-add-btn').on('click.ddfa', '#dd-fa-add-btn', function () {
      openNewModal();
    });

    // Pagination
    $(document).off('click.ddfa', '#dd-fa-prev').on('click.ddfa', '#dd-fa-prev', function () {
      if (state.page > 0) {
        state.page--;
        loadFirearms();
      }
    });
    $(document).off('click.ddfa', '#dd-fa-next').on('click.ddfa', '#dd-fa-next', function () {
      var totalPages = Math.ceil(state.totalCount / PAGE_SIZE);
      if (state.page + 1 < totalPages) {
        state.page++;
        loadFirearms();
      }
    });

    // Card clicks (delegated)
    $(document).off('click.ddfa', '.dd-fa-card').on('click.ddfa', '.dd-fa-card', function () {
      var id = $(this).data('id');
      if (!id) return;
      for (var i = 0; i < state.firearms.length; i++) {
        if (state.firearms[i]._id === id) {
          openDetailModal(state.firearms[i]);
          return;
        }
      }
    });

    loadFirearms();
    if (window.ddLimits) window.ddLimits.check('firearm');
  }

  /* ═════════════════════════════════════════════════════════════════════
     DATA  —  fetch firearms list
     ═════════════════════════════════════════════════════════════════════ */

  function loadFirearms() {
    if (state.loading) return;
    state.loading = true;

    var $grid = $('#dd-fa-grid');
    var $loading = $('.dd-fa-loading');
    var $empty = $('.dd-fa-empty');
    var $pagination = $('#dd-fa-pagination');

    $grid.hide();
    $empty.hide();
    $pagination.hide();
    $loading.show();

    var url = apiUrl() + '/api/v2/firearms/user/' + encodeURIComponent(cfg().userId) +
      '?active_community_id=' + encodeURIComponent(cfg().communityId) +
      '&limit=' + PAGE_SIZE +
      '&page=' + state.page;

    $.ajax({
      url: url,
      method: 'GET',
      headers: {},
      success: function (data) {
        state.loading = false;
        $loading.hide();

        state.firearms = normalizeList(data);
        state.totalCount = extractTotal(data);

        // If the endpoint returned a plain array without totalCount, estimate
        if (state.totalCount === 0 && state.firearms.length > 0) {
          // We don't know the true total, so use a heuristic
          state.totalCount = state.firearms.length + (state.page * PAGE_SIZE);
          if (state.firearms.length === PAGE_SIZE) {
            // Probably more pages
            state.totalCount += 1;
          }
        }

        if (state.firearms.length === 0 && state.page === 0) {
          $empty.show();
          return;
        }

        renderCards();
        $grid.show();
        updatePagination();
      },
      error: function (xhr, status, err) {
        state.loading = false;
        $loading.hide();
        $empty.show().find('.dd-empty-title').text('Failed to load firearms');
        $empty.find('.dd-empty-sub').text(err || status || 'Network error');
        console.error('[dd-firearms] Load error:', status, err);
      }
    });
  }

  /* ═════════════════════════════════════════════════════════════════════
     RENDER CARDS
     ═════════════════════════════════════════════════════════════════════ */

  function renderCards() {
    var $grid = $('#dd-fa-grid');
    $grid.empty();

    var list = state.firearms;

    // Client-side filter when searching (supplement server-side)
    if (state.searchQuery) {
      var q = state.searchQuery.toLowerCase();
      list = [];
      for (var i = 0; i < state.firearms.length; i++) {
        var f = state.firearms[i];
        if (
          (f.name && f.name.toLowerCase().indexOf(q) !== -1) ||
          (f.weaponType && f.weaponType.toLowerCase().indexOf(q) !== -1) ||
          (f.serialNumber && f.serialNumber.toLowerCase().indexOf(q) !== -1)
        ) {
          list.push(f);
        }
      }
    }

    for (var j = 0; j < list.length; j++) {
      $grid.append(buildCard(list[j]));
    }
  }

  function buildCard(f) {
    var esc = window.esc;
    var iconHtml;
    if (f.image) {
      iconHtml = '<div class="dd-fa-card-icon"><img src="' + esc(f.image) + '" alt=""></div>';
    } else {
      iconHtml = '<div class="dd-fa-card-icon"><i class="fa fa-crosshairs"></i></div>';
    }

    var title = f.name || f.serialNumber || 'Unknown';
    var metaParts = [];
    if (f.weaponType) metaParts.push(esc(f.weaponType));
    if (f.caliber) metaParts.push(esc(f.caliber));
    if (!f.name && f.serialNumber) {
      // Serial already used as title, skip
    } else if (f.serialNumber) {
      metaParts.push('SN: ' + esc(f.serialNumber));
    }

    var stolenHtml = '';
    if (f.isStolen) {
      stolenHtml = '<span class="dd-fa-stolen-badge"><i class="fa fa-exclamation-triangle"></i> STOLEN</span>';
    }

    return $(
      '<div class="dd-fa-card" data-id="' + esc(f._id) + '">' +
        iconHtml +
        '<p class="dd-fa-card-title">' + esc(title) + '</p>' +
        '<p class="dd-fa-card-meta">' + (metaParts.join(' &middot; ') || 'No details') + '</p>' +
        stolenHtml +
      '</div>'
    );
  }

  /* ═════════════════════════════════════════════════════════════════════
     PAGINATION
     ═════════════════════════════════════════════════════════════════════ */

  function updatePagination() {
    var totalPages = Math.max(1, Math.ceil(state.totalCount / PAGE_SIZE));
    var $pagination = $('#dd-fa-pagination');

    if (totalPages <= 1 && state.page === 0) {
      $pagination.hide();
      return;
    }

    $pagination.show();
    $('#dd-fa-page-info').text('Page ' + (state.page + 1) + ' of ' + totalPages);
    $('#dd-fa-prev').prop('disabled', state.page <= 0);
    $('#dd-fa-next').prop('disabled', state.page + 1 >= totalPages);
  }

  /* ═════════════════════════════════════════════════════════════════════
     DETAIL MODAL  —  view / edit / delete an existing firearm
     ═════════════════════════════════════════════════════════════════════ */

  function ensureDetailModal() {
    if (detailModalCreated) return;
    detailModalCreated = true;

    var html =
      '<div class="dd-civ-new-overlay" id="dd-fa-detail-overlay">' +
        '<div class="dd-civ-new-panel">' +
          '<div class="dd-civ-new-header">' +
            '<span class="dd-civ-new-title"><i class="fa fa-crosshairs" style="margin-right:0.4rem;color:var(--dd-red);"></i>Firearm Details</span>' +
            '<button class="dd-civ-close" id="dd-fa-detail-close"><i class="fa fa-times"></i></button>' +
          '</div>' +
          '<div class="dd-civ-new-body">' +
            '<input type="hidden" id="dd-fa-det-image-url">' +
            '<div style="display:flex;align-items:center;gap:1rem;margin-bottom:0.75rem;">' +
              '<div class="dd-civ-photo-upload" id="dd-fa-det-photo-wrap" style="flex-shrink:0;">' +
                '<div style="width:64px;height:48px;border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:rgba(239,68,68,0.1);border:1.5px solid var(--dd-glass-border);">' +
                  '<i class="fa fa-crosshairs" style="font-size:1.25rem;color:var(--dd-red);" id="dd-fa-det-photo-icon"></i>' +
                  '<img id="dd-fa-det-photo-img" src="" alt="" style="display:none;width:100%;height:100%;object-fit:cover;">' +
                '</div>' +
                '<div class="dd-civ-photo-overlay"><i class="fa fa-camera"></i></div>' +
                '<input type="file" accept="image/*" id="dd-fa-det-photo-input" style="display:none;" />' +
              '</div>' +
              '<div style="font-size:0.75rem;color:var(--dd-text-muted);">Firearm Photo</div>' +
            '</div>' +
            '<div class="dd-civ-form-grid">' +
              '<div class="dd-civ-field" style="grid-column:1/-1;">' +
                '<label>Serial Number</label>' +
                '<div style="display:flex;gap:0.5rem;">' +
                  '<input type="text" id="dd-fa-det-serial" placeholder="Serial number" style="flex:1;">' +
                  '<button class="dd-civ-btn dd-civ-btn-secondary dd-civ-btn-small" id="dd-fa-det-gen-serial" type="button" title="Auto-generate serial"><i class="fa fa-random"></i></button>' +
                '</div>' +
              '</div>' +
              '<div class="dd-civ-field" style="grid-column:1/-1;">' +
                '<label>Name</label>' +
                '<input type="text" id="dd-fa-det-name" placeholder="Firearm name">' +
              '</div>' +
              '<div class="dd-civ-field">' +
                '<label>Weapon Type</label>' +
                '<input type="text" id="dd-fa-det-type" placeholder="e.g. Pistol, Rifle">' +
              '</div>' +
              '<div class="dd-civ-field">' +
                '<label>Caliber</label>' +
                '<input type="text" id="dd-fa-det-caliber" placeholder="e.g. 9mm, .45 ACP">' +
              '</div>' +
              '<div class="dd-civ-checkbox-row">' +
                '<label class="dd-civ-checkbox"><input type="checkbox" id="dd-fa-det-stolen"> Reported Stolen</label>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="dd-civ-new-footer">' +
            '<button class="dd-civ-btn dd-civ-btn-danger dd-civ-btn-small" id="dd-fa-det-delete"><i class="fa fa-trash" style="margin-right:0.3rem;"></i>Delete</button>' +
            '<span style="flex:1;"></span>' +
            '<button class="dd-civ-btn dd-civ-btn-primary dd-civ-btn-small" id="dd-fa-det-save"><i class="fa fa-check" style="margin-right:0.3rem;"></i>Save Changes</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    $('body').append(html);

    // Close handlers
    $('#dd-fa-detail-close').on('click', closeDetailModal);
    $('#dd-fa-detail-overlay').on('click', function (e) {
      if (e.target === this) closeDetailModal();
    });
    $(document).on('keydown.ddfa-detail', function (e) {
      if (e.key === 'Escape' && $('#dd-fa-detail-overlay').hasClass('dd-civ-visible')) {
        closeDetailModal();
      }
    });

    // Serial generator in edit modal
    $('#dd-fa-det-gen-serial').on('click', function () {
      $('#dd-fa-det-serial').val(generateSerial());
    });

    // Photo upload in edit modal
    $('#dd-fa-det-photo-input').on('click', function (e) { e.stopPropagation(); });
    $('#dd-fa-det-photo-wrap').on('click', function () {
      $('#dd-fa-det-photo-input').trigger('click');
    });
    $('#dd-fa-det-photo-input').on('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!window.uploadToCloudinary) {
        window.ddToast('Photo upload not configured', 'error');
        return;
      }
      var $img = $('#dd-fa-det-photo-img');
      var $icon = $('#dd-fa-det-photo-icon');
      $icon.attr('class', 'fa fa-spinner fa-spin').css({'font-size':'1.25rem','color':'var(--dd-text-muted)'});
      window.uploadToCloudinary(file, 'firearms', null)
        .then(function (url) {
          $img.attr('src', url).show();
          $icon.hide();
          $('#dd-fa-det-image-url').val(url);
          window.ddToast('Photo uploaded', 'success');
        })
        .catch(function () {
          $icon.attr('class', 'fa fa-crosshairs').css({'font-size':'1.25rem','color':'var(--dd-red)'}).show();
          window.ddToast('Photo upload failed', 'error');
        });
    });

    // Save
    $('#dd-fa-det-save').on('click', function () {
      saveFirearm();
    });

    // Delete
    $('#dd-fa-det-delete').on('click', function () {
      deleteFirearm();
    });
  }

  var currentDetailId = null;

  function openDetailModal(f) {
    ensureDetailModal();
    currentDetailId = f._id;

    $('#dd-fa-det-serial').val(f.serialNumber);
    $('#dd-fa-det-name').val(f.name);
    $('#dd-fa-det-type').val(f.weaponType);
    $('#dd-fa-det-caliber').val(f.caliber);
    $('#dd-fa-det-image-url').val(f.image);
    $('#dd-fa-det-stolen').prop('checked', f.isStolen);
    // Photo preview
    if (f.image) {
      $('#dd-fa-det-photo-img').attr('src', f.image).show();
      $('#dd-fa-det-photo-icon').hide();
    } else {
      $('#dd-fa-det-photo-img').hide();
      $('#dd-fa-det-photo-icon').attr('class', 'fa fa-crosshairs dd-fa-photo-icon').show();
    }

    // Reset button states
    $('#dd-fa-det-save').prop('disabled', false);
    $('#dd-fa-det-delete').prop('disabled', false);

    $('#dd-fa-detail-overlay').addClass('dd-civ-visible');
  }

  function closeDetailModal() {
    $('#dd-fa-detail-overlay').removeClass('dd-civ-visible');
    currentDetailId = null;
  }

  /* ── Save (update) ── */

  function saveFirearm() {
    if (state.saving || !currentDetailId) return;
    state.saving = true;
    var $btn = $('#dd-fa-det-save');
    $btn.prop('disabled', true);

    var payload = {
      serialNumber: $('#dd-fa-det-serial').val().trim(),
      name: $('#dd-fa-det-name').val().trim(),
      weaponType: $('#dd-fa-det-type').val().trim(),
      caliber: $('#dd-fa-det-caliber').val().trim(),
      image: $('#dd-fa-det-image-url').val().trim(),
      isStolen: boolToApi($('#dd-fa-det-stolen').is(':checked'))
    };

    $.ajax({
      url: apiUrl() + '/api/v1/firearm/' + encodeURIComponent(currentDetailId),
      method: 'PUT',
      headers: {},
      contentType: 'application/json',
      data: JSON.stringify(payload),
      success: function () {
        state.saving = false;
        $btn.prop('disabled', false);
        window.ddToast('Firearm updated', 'success');
        closeDetailModal();
        loadFirearms();
      },
      error: function (xhr, status, err) {
        state.saving = false;
        $btn.prop('disabled', false);
        window.ddToast('Failed to update firearm', 'error');
        console.error('[dd-firearms] Update error:', status, err);
      }
    });
  }

  /* ── Delete ── */

  function deleteFirearm() {
    if (state.deleting || !currentDetailId) return;
    var firearmId = currentDetailId;

    window.ddModal({
      type: 'danger',
      icon: 'fa-trash',
      title: 'Delete Firearm',
      message: 'Are you sure you want to delete this firearm? This action cannot be undone.',
      confirmText: 'Delete',
      onConfirm: function () {
        performDelete(firearmId);
      }
    });
  }

  function performDelete(firearmId) {
    if (state.deleting) return;
    state.deleting = true;
    var $btn = $('#dd-fa-det-delete');
    $btn.prop('disabled', true);

    $.ajax({
      url: apiUrl() + '/api/v1/firearm/' + encodeURIComponent(firearmId),
      method: 'DELETE',
      headers: {},
      success: function () {
        state.deleting = false;
        $btn.prop('disabled', false);
        window.ddToast('Firearm deleted', 'success');
        closeDetailModal();
        loadFirearms();
        if (window.ddLimits) window.ddLimits.check('firearm');
      },
      error: function (xhr, status, err) {
        state.deleting = false;
        $btn.prop('disabled', false);
        window.ddToast('Failed to delete firearm', 'error');
        console.error('[dd-firearms] Delete error:', status, err);
      }
    });
  }

  /* ═════════════════════════════════════════════════════════════════════
     NEW FIREARM MODAL  —  create a new firearm
     ═════════════════════════════════════════════════════════════════════ */

  function ensureNewModal() {
    if (newModalCreated) return;
    newModalCreated = true;

    var html =
      '<div class="dd-civ-new-overlay" id="dd-fa-new-overlay">' +
        '<div class="dd-civ-new-panel">' +
          '<div class="dd-civ-new-header">' +
            '<span class="dd-civ-new-title"><i class="fa fa-crosshairs" style="margin-right:0.4rem;color:var(--dd-red);"></i>New Firearm</span>' +
            '<button class="dd-civ-close" id="dd-fa-new-close"><i class="fa fa-times"></i></button>' +
          '</div>' +
          '<div class="dd-civ-new-body">' +
            '<input type="hidden" id="dd-fa-new-image-url">' +
            '<div style="display:flex;align-items:center;gap:1rem;margin-bottom:0.75rem;">' +
              '<div class="dd-civ-photo-upload" id="dd-fa-new-photo-wrap" style="flex-shrink:0;">' +
                '<div style="width:64px;height:48px;border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:rgba(239,68,68,0.1);border:1.5px solid var(--dd-glass-border);">' +
                  '<i class="fa fa-crosshairs" style="font-size:1.25rem;color:var(--dd-red);" id="dd-fa-new-photo-icon"></i>' +
                  '<img id="dd-fa-new-photo-img" src="" alt="" style="display:none;width:100%;height:100%;object-fit:cover;">' +
                '</div>' +
                '<div class="dd-civ-photo-overlay"><i class="fa fa-camera"></i></div>' +
                '<input type="file" accept="image/*" id="dd-fa-new-photo-input" style="display:none;" />' +
              '</div>' +
              '<div style="font-size:0.75rem;color:var(--dd-text-muted);">Firearm Photo</div>' +
            '</div>' +
            '<div class="dd-civ-form-grid">' +
              '<div class="dd-civ-field" style="grid-column:1/-1;">' +
                '<label>Serial Number</label>' +
                '<div style="display:flex;gap:0.5rem;">' +
                  '<input type="text" id="dd-fa-new-serial" placeholder="Serial number" style="flex:1;">' +
                  '<button class="dd-civ-btn dd-civ-btn-secondary dd-civ-btn-small" id="dd-fa-gen-serial" type="button" title="Auto-generate serial"><i class="fa fa-random"></i></button>' +
                '</div>' +
              '</div>' +
              '<div class="dd-civ-field" style="grid-column:1/-1;">' +
                '<label>Name</label>' +
                '<input type="text" id="dd-fa-new-name" placeholder="Firearm name">' +
              '</div>' +
              '<div class="dd-civ-field">' +
                '<label>Weapon Type</label>' +
                '<input type="text" id="dd-fa-new-type" placeholder="e.g. Pistol, Rifle">' +
              '</div>' +
              '<div class="dd-civ-field">' +
                '<label>Caliber</label>' +
                '<input type="text" id="dd-fa-new-caliber" placeholder="e.g. 9mm, .45 ACP">' +
              '</div>' +
              '<div class="dd-civ-field" style="grid-column:1/-1;">' +
                '<label>Color</label>' +
                '<input type="text" id="dd-fa-new-color" placeholder="e.g. Black, Silver">' +
              '</div>' +
              '<div class="dd-civ-checkbox-row">' +
                '<label class="dd-civ-checkbox"><input type="checkbox" id="dd-fa-new-stolen"> Reported Stolen</label>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="dd-civ-new-footer">' +
            '<button class="dd-civ-btn dd-civ-btn-secondary" id="dd-fa-new-cancel">Cancel</button>' +
            '<button class="dd-civ-btn dd-civ-btn-primary" id="dd-fa-new-submit"><i class="fa fa-plus" style="margin-right:0.3rem;"></i>Create Firearm</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    $('body').append(html);

    // Close handlers
    $('#dd-fa-new-close, #dd-fa-new-cancel').on('click', closeNewModal);
    $('#dd-fa-new-overlay').on('click', function (e) {
      if (e.target === this) closeNewModal();
    });
    $(document).on('keydown.ddfa-new', function (e) {
      if (e.key === 'Escape' && $('#dd-fa-new-overlay').hasClass('dd-civ-visible')) {
        closeNewModal();
      }
    });

    // Generate serial
    $('#dd-fa-gen-serial').on('click', function () {
      $('#dd-fa-new-serial').val(generateSerial());
    });

    // Photo upload in new modal
    $('#dd-fa-new-photo-input').on('click', function (e) { e.stopPropagation(); });
    $('#dd-fa-new-photo-wrap').on('click', function () {
      $('#dd-fa-new-photo-input').trigger('click');
    });
    $('#dd-fa-new-photo-input').on('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!window.uploadToCloudinary) {
        window.ddToast('Photo upload not configured', 'error');
        return;
      }
      var $img = $('#dd-fa-new-photo-img');
      var $icon = $('#dd-fa-new-photo-icon');
      $icon.attr('class', 'fa fa-spinner fa-spin').css({'font-size':'1.25rem','color':'var(--dd-text-muted)'});
      window.uploadToCloudinary(file, 'firearms', null)
        .then(function (url) {
          $img.attr('src', url).show();
          $icon.hide();
          $('#dd-fa-new-image-url').val(url);
          window.ddToast('Photo uploaded', 'success');
        })
        .catch(function () {
          $icon.attr('class', 'fa fa-crosshairs').css({'font-size':'1.25rem','color':'var(--dd-red)'}).show();
          window.ddToast('Photo upload failed', 'error');
        });
    });

    // Submit
    $('#dd-fa-new-submit').on('click', function () {
      createFirearm();
    });
  }

  function openNewModal() {
    ensureNewModal();

    // Reset form
    $('#dd-fa-new-serial').val('');
    $('#dd-fa-new-name').val('');
    $('#dd-fa-new-type').val('');
    $('#dd-fa-new-caliber').val('');
    $('#dd-fa-new-color').val('');
    $('#dd-fa-new-image-url').val('');
    $('#dd-fa-new-photo-img').hide();
    $('#dd-fa-new-photo-icon').attr('class', 'fa fa-crosshairs dd-fa-photo-icon').show();
    $('#dd-fa-new-stolen').prop('checked', false);
    $('#dd-fa-new-submit').prop('disabled', false);

    $('#dd-fa-new-overlay').addClass('dd-civ-visible');
  }

  function closeNewModal() {
    $('#dd-fa-new-overlay').removeClass('dd-civ-visible');
  }

  function createFirearm() {
    if (state.saving) return;

    var serial = $('#dd-fa-new-serial').val().trim();
    if (!serial) {
      window.ddToast('Serial number is required', 'error');
      return;
    }

    state.saving = true;
    var $btn = $('#dd-fa-new-submit');
    $btn.prop('disabled', true);

    var payload = {
      serialNumber: serial,
      name: $('#dd-fa-new-name').val().trim(),
      weaponType: $('#dd-fa-new-type').val().trim(),
      caliber: $('#dd-fa-new-caliber').val().trim(),
      color: $('#dd-fa-new-color').val().trim(),
      image: $('#dd-fa-new-image-url').val().trim(),
      isStolen: boolToApi($('#dd-fa-new-stolen').is(':checked')),
      userID: cfg().userId,
      activeCommunityID: cfg().communityId
    };

    $.ajax({
      url: apiUrl() + '/api/v1/firearm',
      method: 'POST',
      headers: {},
      contentType: 'application/json',
      data: JSON.stringify(payload),
      success: function () {
        state.saving = false;
        $btn.prop('disabled', false);
        window.ddToast('Firearm created', 'success');
        closeNewModal();
        // Reset to first page so the new firearm is visible
        state.page = 0;
        loadFirearms();
        if (window.ddLimits) window.ddLimits.check('firearm');
      },
      error: function (xhr, status, err) {
        state.saving = false;
        $btn.prop('disabled', false);
        window.ddToast('Failed to create firearm', 'error');
        console.error('[dd-firearms] Create error:', status, err);
      }
    });
  }

  /* ═════════════════════════════════════════════════════════════════════
     REGISTER ON WINDOW
     ═════════════════════════════════════════════════════════════════════ */

  window.ddFirearmRender = ddFirearmRender;
  window.ddFirearmInit = ddFirearmInit;

})();
