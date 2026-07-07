/**
 * Department Dashboard — Department Management Component
 *
 * Full component view (not a modal) with four tabs:
 *   1. Settings   — name, description, privacy toggle
 *   2. Components — toggle department template components on/off
 *   3. Members    — view / add / remove members (private depts)
 *   4. Options    — leave department, delete department
 *
 * Permission-aware:
 *   - Settings tab: visible to all, editable with "manage departments"
 *   - Components tab: requires "manage departments"
 *   - Members tab: requires "manage members" (private depts only)
 *   - Delete dept: requires "manage departments" OR Head Admin
 *   - Leave dept: everyone except owner / Head Admin
 *
 * Registers window.ddSettingsRender / window.ddSettingsInit for the component registry.
 */
(function () {
  'use strict';

  var cfg   = function () { return window.ddConfig || {}; };
  var esc   = function (s) { return window.esc ? window.esc(s) : String(s || '').replace(/[&<>"']/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); };
  var toast = function (m, t) { if (window.ddToast) window.ddToast(m, t); };

  /* ─── Permissions ────────────────────────── */

  function getUserPermissions() {
    var c = cfg();
    var userId = c.userId || '';
    var community = c.communityData || {};
    var roles = community.roles || [];
    var ownerID = community.ownerID || '';
    var isOwner = ownerID === userId;
    var perms = {
      isOwner: isOwner,
      manageDepartments: false,
      manageMembers: false,
      isAdmin: false,
      isHeadAdmin: false
    };

    roles.forEach(function (role) {
      var members = role.members || [];
      if (members.indexOf(userId) === -1) return;
      (role.permissions || []).forEach(function (p) {
        if (p.name === 'administrator' && p.enabled) perms.isAdmin = true;
        if (p.name === 'manage departments' && p.enabled) perms.manageDepartments = true;
        if (p.name === 'manage members' && p.enabled) perms.manageMembers = true;
        if (p.description === 'Head Admin' && p.enabled) perms.isHeadAdmin = true;
      });
    });

    if (isOwner || perms.isAdmin) {
      perms.manageDepartments = true;
      perms.manageMembers = true;
    }
    return perms;
  }

  function getDept() { return (cfg().departmentData) || {}; }

  /* ─── Auto-save helpers ───────────────────── */

  var DEBOUNCE_MS = 800; // ms after last keystroke before saving
  var SAVED_DISPLAY_MS = 2500; // ms to show "Saved" before fading

  /**
   * Show auto-save status in a target element.
   * @param {string} selector  CSS selector for the .dds-autosave element
   * @param {'saving'|'saved'|'error'|'idle'} state
   * @param {string} [errorMsg]
   */
  function showSaveStatus(selector, state, errorMsg) {
    var $el = $(selector);
    if (!$el.length) return;
    $el.removeClass('saved error');

    if (state === 'saving') {
      $el.html('<i class="fa fa-spinner fa-spin"></i><span class="dds-autosave-text">Saving</span>');
      $el.css('opacity', 1);
    } else if (state === 'saved') {
      $el.addClass('saved');
      $el.html('<i class="fa fa-check"></i><span class="dds-autosave-text">Saved</span>');
      $el.css('opacity', 1);
      // Fade out after delay
      var fadeTimer = $el.data('fadeTimer');
      if (fadeTimer) clearTimeout(fadeTimer);
      $el.data('fadeTimer', setTimeout(function () {
        $el.css('opacity', 0);
      }, SAVED_DISPLAY_MS));
    } else if (state === 'error') {
      $el.addClass('error');
      $el.html('<i class="fa fa-exclamation-circle"></i><span class="dds-autosave-text">' + (errorMsg || 'Error') + '</span>');
      $el.css('opacity', 1);
    } else {
      $el.html('').css('opacity', 0);
    }
  }

  // Debounce timers (keyed by purpose)
  var debounceTimers = {};

  /**
   * Debounce a save call. If an inflight request exists for the key, it will
   * be allowed to complete (we don't abort), but the next save will overwrite.
   */
  function debounceSave(key, fn, delay) {
    if (debounceTimers[key]) clearTimeout(debounceTimers[key]);
    debounceTimers[key] = setTimeout(function () {
      debounceTimers[key] = null;
      fn();
    }, delay || DEBOUNCE_MS);
  }

  /* ─── Template config ────────────────────── */

  var tplIcons = {
    police:   { icon: 'fa-shield-halved', color: '#6366f1', label: 'Police' },
    dispatch: { icon: 'fa-headset',       color: '#22c55e', label: 'Dispatch' },
    fire:     { icon: 'fa-fire',          color: '#ef4444', label: 'Fire' },
    ems:      { icon: 'fa-truck-medical', color: '#f59e0b', label: 'EMS' },
    civilian: { icon: 'fa-user',          color: '#6b7280', label: 'Civilian' },
    judicial: { icon: 'fa-gavel',         color: '#f59e0b', label: 'Judicial' }
  };

  /* ─── Styles ─────────────────────────────── */

  var stylesInjected = false;

  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;

    var css = '' +
      /* Layout */
      '.dds-wrap{padding:0.5rem 0;}' +

      /* Department header card */
      '.dds-dept-card{display:flex;align-items:center;gap:1rem;padding:1rem 1.25rem;border-radius:14px;background:var(--dd-glass);border:1px solid var(--dd-glass-border);margin-bottom:1.25rem;}' +
      '.dds-dept-img{width:56px;height:56px;border-radius:14px;object-fit:cover;flex-shrink:0;background:rgba(255,255,255,0.05);}' +
      '.dds-dept-icon{width:56px;height:56px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.375rem;flex-shrink:0;}' +
      '.dds-dept-info{min-width:0;flex:1;}' +
      '.dds-dept-name{font-size:1.0625rem;font-weight:700;color:var(--dd-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.dds-dept-meta{font-size:0.75rem;color:var(--dd-text-muted);margin-top:0.15rem;}' +

      /* Tabs */
      '.dds-tabs{display:flex;gap:0;border-bottom:1px solid var(--dd-glass-border);margin-bottom:1.25rem;overflow-x:auto;}' +
      '.dds-tab{padding:0.625rem 1rem;font-size:0.8125rem;font-weight:600;color:var(--dd-text-muted);cursor:pointer;border-bottom:2px solid transparent;transition:all 0.2s;white-space:nowrap;background:none;border-top:none;border-left:none;border-right:none;font-family:"Outfit",sans-serif;}' +
      '.dds-tab:hover{color:var(--dd-text);}' +
      '.dds-tab.active{color:var(--dd-accent);border-bottom-color:var(--dd-accent);}' +
      '.dds-tab .dds-tab-icon{margin-right:0.35rem;}' +
      '.dds-tab-badge{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;margin-left:0.4rem;border-radius:9px;background:var(--dd-accent);color:#fff;font-size:0.625rem;font-weight:700;line-height:1;font-variant-numeric:tabular-nums;vertical-align:middle;}' +
      '.dds-tab.active .dds-tab-badge{background:var(--dd-accent-glow,var(--dd-accent));color:var(--dd-accent);}' +

      /* Tab body */
      '.dds-tab-body{min-height:200px;}' +

      /* Section */
      '.dds-section{margin-bottom:1.5rem;}' +
      '.dds-section:last-child{margin-bottom:0;}' +
      '.dds-section-title{font-size:0.6875rem;font-weight:600;color:var(--dd-text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:0.75rem;}' +

      /* Field */
      '.dds-field{margin-bottom:0.75rem;}' +
      '.dds-field:last-child{margin-bottom:0;}' +
      '.dds-field-label{font-size:0.75rem;font-weight:500;color:var(--dd-text-muted);margin-bottom:0.35rem;display:block;}' +
      '.dds-input{width:100%;padding:0.5rem 0.65rem;background:var(--dd-glass);border:1px solid var(--dd-glass-border);border-radius:8px;color:var(--dd-text);font-size:0.8125rem;outline:none;font-family:"Outfit",sans-serif;transition:border-color 0.2s;box-sizing:border-box;}' +
      '.dds-input:focus{border-color:var(--dd-accent);}' +
      '.dds-input:disabled{opacity:0.5;cursor:not-allowed;}' +
      '.dds-field-hint{font-size:0.6875rem;color:var(--dd-text-muted);margin-top:0.3rem;}' +
      '.dds-field-error{font-size:0.6875rem;color:#ef4444;margin-top:0.3rem;display:none;}' +
      '.dds-input.is-invalid{border-color:#ef4444;}' +
      '.dds-input.is-invalid:focus{border-color:#ef4444;box-shadow:0 0 0 2px rgba(239,68,68,0.18);}' +
      '.dds-field.has-error .dds-field-hint{display:none;}' +
      '.dds-field.has-error .dds-field-error{display:block;}' +
      '.dds-label-row{display:flex;align-items:center;gap:0.35rem;margin-bottom:0.35rem;}' +
      '.dds-label-row .dds-field-label{margin-bottom:0;}' +
      '.dds-help-btn{width:18px;height:18px;padding:0;border:0;cursor:pointer;background:transparent;color:var(--dd-text-muted);display:inline-flex;align-items:center;justify-content:center;border-radius:50%;transition:color 120ms ease,background 120ms ease;}' +
      '.dds-help-btn:hover,.dds-help-btn:focus{outline:none;color:var(--dd-accent);background:rgba(255,255,255,0.05);}' +
      '.dds-help-btn i{font-size:0.7rem;}' +
      '.dds-textarea{width:100%;padding:0.5rem 0.65rem;background:var(--dd-glass);border:1px solid var(--dd-glass-border);border-radius:8px;color:var(--dd-text);font-size:0.8125rem;outline:none;font-family:"Outfit",sans-serif;transition:border-color 0.2s;box-sizing:border-box;resize:vertical;min-height:60px;}' +
      '.dds-textarea:focus{border-color:var(--dd-accent);}' +
      '.dds-textarea:disabled{opacity:0.5;cursor:not-allowed;}' +

      /* Toggle row */
      '.dds-toggle-row{display:flex;align-items:center;justify-content:space-between;padding:0.75rem 0;border-bottom:1px solid var(--dd-glass-border);}' +
      '.dds-toggle-row:last-child{border-bottom:none;}' +
      '.dds-toggle-info{display:flex;flex-direction:column;gap:0.15rem;flex:1;min-width:0;}' +
      '.dds-toggle-label{font-size:0.8125rem;font-weight:500;color:var(--dd-text);}' +
      '.dds-toggle-desc{font-size:0.6875rem;color:var(--dd-text-muted);}' +

      /* Switch */
      '.dds-switch{position:relative;width:40px;height:22px;flex-shrink:0;}' +
      '.dds-switch input{opacity:0;width:0;height:0;}' +
      '.dds-switch-track{position:absolute;inset:0;border-radius:11px;background:rgba(255,255,255,0.1);cursor:pointer;transition:background 0.2s;}' +
      '.dds-switch-track::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform 0.2s;}' +
      '.dds-switch input:checked+.dds-switch-track{background:var(--dd-accent);}' +
      '.dds-switch input:checked+.dds-switch-track::after{transform:translateX(18px);}' +
      '.dds-switch input:disabled+.dds-switch-track{opacity:0.5;cursor:not-allowed;}' +

      /* Buttons */
      '.dds-btn{padding:0.5rem 1rem;border:none;border-radius:8px;font-size:0.8125rem;font-weight:600;cursor:pointer;transition:all 0.2s;font-family:"Outfit",sans-serif;display:inline-flex;align-items:center;gap:0.4rem;}' +
      '.dds-btn-primary{background:var(--dd-accent);color:#fff;}' +
      '.dds-btn-primary:hover{filter:brightness(1.15);}' +
      '.dds-btn-primary:disabled{opacity:0.5;cursor:default;filter:none;}' +
      '.dds-btn-secondary{background:var(--dd-glass);color:var(--dd-text);border:1px solid var(--dd-glass-border);}' +
      '.dds-btn-secondary:hover{border-color:rgba(255,255,255,0.15);}' +
      '.dds-btn-danger{background:rgba(239,68,68,0.12);color:var(--dd-red);border:1px solid rgba(239,68,68,0.2);}' +
      '.dds-btn-danger:hover{background:rgba(239,68,68,0.2);border-color:rgba(239,68,68,0.35);}' +

      /* Custom range slider */
      '.dds-slider-wrap{width:100%;height:32px;position:relative;}' +
      '.dds-slider-wrap input[type="range"]{-webkit-appearance:none;appearance:none;width:100%;height:6px;border-radius:3px;background:#1e2235;outline:none;cursor:pointer;}' +
      '.dds-slider-wrap input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#38bdf8,#0ea5e9);border:2px solid rgba(255,255,255,0.15);box-shadow:0 2px 8px rgba(56,189,248,0.35),0 0 0 4px rgba(56,189,248,0.08);cursor:pointer;transition:box-shadow 0.15s;}' +
      '.dds-slider-wrap input[type="range"]::-webkit-slider-thumb:hover{box-shadow:0 2px 12px rgba(56,189,248,0.5),0 0 0 6px rgba(56,189,248,0.12);}' +
      '.dds-slider-wrap input[type="range"]::-moz-range-thumb{width:22px;height:22px;border-radius:50%;border:2px solid rgba(255,255,255,0.15);background:linear-gradient(135deg,#38bdf8,#0ea5e9);box-shadow:0 2px 8px rgba(56,189,248,0.35);cursor:pointer;}' +
      '.dds-slider-wrap input[type="range"]::-moz-range-track{height:6px;border-radius:3px;background:#1e2235;border:none;}' +

      /* Volume bars visualization */
      '.dds-volume-bars{display:flex;align-items:flex-end;gap:3px;height:20px;margin-top:10px;padding:0 2px;}' +
      '.dds-volume-bars span{flex:1;border-radius:2px;background:#1e2235;min-height:3px;transition:background 0.15s,height 0.2s;}' +
      '.dds-volume-bars span.active{background:rgba(56,189,248,0.4);}' +
      '.dds-volume-bars span.active.bright{background:#38bdf8;}' +

      /* Save bar (legacy, kept for potential future use) */
      '.dds-save-bar{display:flex;justify-content:flex-end;gap:0.5rem;margin-top:1rem;padding-top:0.75rem;border-top:1px solid var(--dd-glass-border);}' +

      /* Auto-save status indicator */
      '.dds-autosave{display:inline-flex;align-items:center;gap:0.3rem;font-size:0.6875rem;color:var(--dd-text-muted);height:1.125rem;min-width:0;transition:opacity 0.3s;vertical-align:middle;margin-left:0.5rem;}' +
      '.dds-autosave .fa-spinner{color:var(--dd-text-muted);}' +
      '.dds-autosave .fa-check{color:#22c55e;}' +
      '.dds-autosave-text{white-space:nowrap;}' +
      '.dds-autosave.saved .dds-autosave-text{color:#22c55e;}' +
      '.dds-autosave.error .dds-autosave-text{color:var(--dd-red);}' +
      '.dds-field-label-row{display:flex;align-items:center;justify-content:space-between;}' +
      '.dds-section-title-row{display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;}' +

      /* Banner */
      '.dds-info{display:flex;align-items:flex-start;gap:0.6rem;padding:0.65rem 0.75rem;border-radius:8px;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.15);margin-bottom:0.75rem;font-size:0.75rem;color:var(--dd-text-muted);line-height:1.4;}' +
      '.dds-info i{color:var(--dd-accent);margin-top:0.1rem;flex-shrink:0;}' +
      '.dds-warn{display:flex;align-items:flex-start;gap:0.6rem;padding:0.65rem 0.75rem;border-radius:8px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.15);margin-bottom:0.75rem;font-size:0.75rem;color:var(--dd-text-muted);line-height:1.4;}' +
      '.dds-warn i{color:var(--dd-red);margin-top:0.1rem;flex-shrink:0;}' +

      /* Component list */
      '.dds-comp-list{display:flex;flex-direction:column;gap:0.25rem;}' +
      '.dds-comp-row{display:flex;align-items:center;justify-content:space-between;padding:0.625rem 0.75rem;border-radius:8px;background:var(--dd-glass);border:1px solid var(--dd-glass-border);transition:border-color 0.2s,box-shadow 0.2s;}' +
      '.dds-comp-row:hover{border-color:rgba(255,255,255,0.1);}' +
      '.dds-comp-row .dds-drag-handle{cursor:grab;color:var(--dd-text-muted);padding:0 0.35rem;margin-right:0.4rem;opacity:0.4;transition:opacity 0.2s;}' +
      '.dds-comp-row:hover .dds-drag-handle{opacity:0.8;}' +
      '.dds-comp-row.sortable-chosen{border-color:var(--dd-accent);box-shadow:0 0 12px rgba(139,92,246,0.25);}' +
      '.dds-comp-row.sortable-ghost{opacity:0.3;}' +
      '.dds-comp-name{font-size:0.8125rem;color:var(--dd-text);font-weight:500;}' +
      '.dds-comp-required{font-size:0.625rem;color:var(--dd-text-muted);background:rgba(255,255,255,0.06);padding:0.1rem 0.4rem;border-radius:4px;margin-left:0.5rem;}' +

      /* Members list */
      '.dds-member{display:flex;align-items:center;gap:0.75rem;padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.03);}' +
      '.dds-member:last-child{border-bottom:none;}' +
      '.dds-member-avatar{width:34px;height:34px;border-radius:50%;background:var(--dd-accent);display:flex;align-items:center;justify-content:center;font-size:0.6875rem;font-weight:700;color:#fff;flex-shrink:0;overflow:hidden;}' +
      '.dds-member-avatar img{width:100%;height:100%;object-fit:cover;}' +
      '.dds-member-info{flex:1;min-width:0;}' +
      '.dds-member-name{font-size:0.8125rem;color:var(--dd-text);font-weight:500;}' +
      '.dds-member-you{font-size:0.6875rem;color:var(--dd-text-muted);font-weight:400;}' +
      '.dds-member-actions{display:flex;gap:0.25rem;}' +
      '.dds-member-btn{background:none;border:none;color:var(--dd-text-muted);cursor:pointer;padding:0.25rem 0.4rem;border-radius:6px;font-size:0.75rem;transition:all 0.2s;}' +
      '.dds-member-btn:hover{background:rgba(239,68,68,0.12);color:var(--dd-red);}' +
      '.dds-members-empty{font-size:0.8125rem;color:var(--dd-text-muted);text-align:center;padding:1.5rem 0;}' +

      /* Add members overlay */
      '.dds-add-overlay{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity 0.25s;}' +
      '.dds-add-overlay.visible{opacity:1;pointer-events:auto;}' +
      '.dds-add-panel{background:rgba(12,13,18,0.97);border:1px solid rgba(255,255,255,0.06);border-radius:16px;width:95%;max-width:460px;max-height:70vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.5);}' +
      '.dds-add-header{display:flex;align-items:center;justify-content:space-between;padding:0.75rem 1rem;border-bottom:1px solid var(--dd-glass-border);flex-shrink:0;}' +
      '.dds-add-title{font-size:0.9375rem;font-weight:700;color:#fff;font-family:"Outfit",sans-serif;}' +
      '.dds-add-close{background:none;border:none;color:var(--dd-text-muted);font-size:1.125rem;cursor:pointer;padding:0.25rem;transition:color 0.2s;line-height:1;}' +
      '.dds-add-close:hover{color:var(--dd-text);}' +
      '.dds-add-body{flex:1;overflow-y:auto;padding:0.75rem 1rem;}' +
      '.dds-add-footer{padding:0.75rem 1rem;border-top:1px solid var(--dd-glass-border);display:flex;justify-content:flex-end;gap:0.5rem;}' +
      '.dds-add-search{width:100%;padding:0.5rem 0.65rem;background:var(--dd-glass);border:1px solid var(--dd-glass-border);border-radius:8px;color:var(--dd-text);font-size:0.8125rem;outline:none;font-family:"Outfit",sans-serif;box-sizing:border-box;margin-bottom:0.75rem;}' +
      '.dds-add-search:focus{border-color:var(--dd-accent);}' +
      '.dds-add-item{display:flex;align-items:center;gap:0.75rem;padding:0.5rem 0;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.03);}' +
      '.dds-add-item:last-child{border-bottom:none;}' +
      '.dds-add-item:hover{background:rgba(255,255,255,0.02);}' +
      '.dds-add-check{width:18px;height:18px;border:2px solid rgba(255,255,255,0.2);border-radius:4px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.2s;font-size:0.625rem;color:transparent;}' +
      '.dds-add-check.checked{background:var(--dd-accent);border-color:var(--dd-accent);color:#fff;}' +
      '.dds-add-item-name{font-size:0.8125rem;color:var(--dd-text);font-weight:500;}' +
      '.dds-add-empty{font-size:0.8125rem;color:var(--dd-text-muted);text-align:center;padding:1.5rem 0;}' +
      '.dds-add-loading{font-size:0.8125rem;color:var(--dd-text-muted);text-align:center;padding:1.5rem 0;}' +

      /* Load more */
      '.dds-load-more{display:flex;justify-content:center;padding:0.5rem 0;}' +
      '.dds-load-more-btn{background:var(--dd-glass);border:1px solid var(--dd-glass-border);border-radius:8px;color:var(--dd-text-muted);padding:0.4rem 1rem;font-size:0.75rem;cursor:pointer;font-family:"Outfit",sans-serif;transition:all 0.2s;}' +
      '.dds-load-more-btn:hover{border-color:rgba(255,255,255,0.15);color:var(--dd-text);}' +

      /* Danger zone */
      '.dds-danger-zone{border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:1rem;background:rgba(239,68,68,0.04);}' +
      '.dds-danger-title{font-size:0.8125rem;font-weight:600;color:var(--dd-red);margin-bottom:0.75rem;}' +
      '.dds-danger-item{display:flex;align-items:center;justify-content:space-between;padding:0.625rem 0;border-bottom:1px solid rgba(239,68,68,0.1);}' +
      '.dds-danger-item:last-child{border-bottom:none;}' +
      '.dds-danger-item-info{flex:1;min-width:0;}' +
      '.dds-danger-item-label{font-size:0.8125rem;color:var(--dd-text);font-weight:500;}' +
      '.dds-danger-item-desc{font-size:0.6875rem;color:var(--dd-text-muted);margin-top:0.1rem;}' +

      /* Responsive */
      '@media(max-width:600px){.dds-tabs{gap:0;}.dds-tab{padding:0.5rem 0.625rem;font-size:0.75rem;}}' +
    '';

    $('<style id="dds-styles">').text(css).appendTo('head');
  }

  /* ─── Component Registry Hooks ───────────── */

  function renderComponent(key) {
    injectStyles();
    return '' +
      '<div class="dd-card-header">' +
        '<div class="dd-card-header-left">' +
          '<div class="dd-card-icon" style="background:rgba(139,92,246,0.15);color:var(--dd-accent);"><i class="fa fa-cog"></i></div>' +
          '<h2 class="dd-card-title">Department Management</h2>' +
        '</div>' +
      '</div>' +
      '<div class="dd-card-body" id="dds-root">' +
        '<div class="dds-wrap"><div style="text-align:center;padding:2rem;color:var(--dd-text-muted);"><i class="fa fa-spinner fa-spin"></i> Loading...</div></div>' +
      '</div>';
  }

  function initComponent() {
    injectStyles();
    renderFull();
  }

  /* ─── Render Full View ───────────────────── */

  // Persisted in the URL via `?tab=<key>` so a refresh stays on the same
  // sub-tab (useful for the Ranks tab in particular, but applies to all).
  function readTabFromUrl() {
    try {
      var t = new URLSearchParams(window.location.search).get('tab');
      return t || '';
    } catch (e) { return ''; }
  }
  function writeTabToUrl(tab) {
    try {
      var url = new URL(window.location.href);
      if (tab && tab !== 'settings') {
        url.searchParams.set('tab', tab);
      } else {
        // 'settings' is the default; keep URLs clean by dropping the param.
        url.searchParams.delete('tab');
      }
      window.history.replaceState(null, '', url.toString());
    } catch (e) { /* noop */ }
  }

  var activeTab = readTabFromUrl() || 'settings';

  function renderFull() {
    var $root = $('#dds-root');
    if (!$root.length) return;

    var dept = getDept();
    var perms = getUserPermissions();
    var deptName = dept.name || 'Department';
    var tplName = (dept.template && dept.template.name || '').toLowerCase();
    var tpl = tplIcons[tplName] || { icon: 'fa-building', color: '#6b7280', label: tplName || 'Unknown' };
    var deptImg = dept.image || '';

    var html = '<div class="dds-wrap">';

    // Department header card
    html += '<div class="dds-dept-card">';
    if (deptImg) {
      html += '<img class="dds-dept-img" src="' + esc(deptImg) + '" alt="" />';
    } else {
      html += '<div class="dds-dept-icon" style="background:' + tpl.color + '20;color:' + tpl.color + ';"><i class="fa ' + tpl.icon + '"></i></div>';
    }
    html += '<div class="dds-dept-info">' +
        '<div class="dds-dept-name">' + esc(deptName) + '</div>' +
        '<div class="dds-dept-meta">' + esc(tpl.label) + ' Department</div>' +
      '</div></div>';

    // Build tabs
    var tabs = [];
    tabs.push({ key: 'settings', label: 'Settings', icon: 'fa-cog' });
    if (perms.manageDepartments) {
      tabs.push({ key: 'components', label: 'Components', icon: 'fa-cubes' });
    }
    if (perms.manageMembers) {
      tabs.push({ key: 'members', label: 'Members', icon: 'fa-users' });
    }
    if (perms.manageDepartments && document.getElementById('manage-ranks-tpl')) {
      // Pending promotions badge — count read from manageRanks at render time.
      var pendingCount = (window.ddRanksPendingCount && window.ddRanksPendingCount[getDept()._id]) || 0;
      tabs.push({
        key: 'ranks',
        label: 'Ranks',
        icon: 'fa-medal',
        badgeCount: pendingCount
      });
    }
    tabs.push({ key: 'danger', label: 'Options', icon: 'fa-ellipsis' });

    var tabKeys = tabs.map(function(t) { return t.key; });
    // Prefer the URL on every render. The dashboards call ddSettingsRender
    // twice — once before community/permissions load (when the Ranks tab
    // isn't built yet) and once after — so we re-resolve from the URL each
    // pass to honor ?tab=ranks once permissions arrive. Don't strip the
    // param if it's currently unrenderable; the second render will pick it up.
    var urlTab = readTabFromUrl();
    if (urlTab && tabKeys.indexOf(urlTab) !== -1) {
      activeTab = urlTab;
    } else if (tabKeys.indexOf(activeTab) === -1) {
      activeTab = 'settings';
    }

    html += '<div class="dds-tabs">';
    tabs.forEach(function (t) {
      var badgeHtml = '';
      if (t.badgeCount && t.badgeCount > 0) {
        badgeHtml = '<span class="dds-tab-badge" data-tab-badge="' + t.key + '">' + (t.badgeCount > 99 ? '99+' : t.badgeCount) + '</span>';
      } else {
        badgeHtml = '<span class="dds-tab-badge" data-tab-badge="' + t.key + '" style="display:none;">0</span>';
      }
      html += '<button class="dds-tab' + (activeTab === t.key ? ' active' : '') + '" data-tab="' + t.key + '">' +
        '<i class="fa ' + t.icon + ' dds-tab-icon"></i>' + t.label + badgeHtml + '</button>';
    });
    html += '</div>';

    html += '<div class="dds-tab-body" id="dds-tab-body"></div>';
    html += '</div>';

    $root.html(html);

    $root.on('click', '.dds-tab', function () {
      var tab = $(this).data('tab');
      if (tab === activeTab) return;
      // Leaving the ranks tab — tear the shared module down so its IDs are free
      // for the next mount and any polling/state is cleaned up.
      if (activeTab === 'ranks' && window.manageRanks) window.manageRanks.destroy();
      activeTab = tab;
      writeTabToUrl(tab);
      $root.find('.dds-tab').removeClass('active');
      $(this).addClass('active');
      renderTab();
    });

    renderTab();
  }

  /* ─── Tab Router ─────────────────────────── */

  function renderTab() {
    var $body = $('#dds-tab-body');
    if (!$body.length) return;

    switch (activeTab) {
      case 'settings':   renderSettingsTab($body); break;
      case 'components': renderComponentsTab($body); break;
      case 'members':    renderMembersTab($body); break;
      case 'ranks':      renderRanksTab($body); break;
      case 'danger':     renderDangerTab($body); break;
    }
  }

  /* ═══════════════════════════════════════════
     TAB 5: Ranks (shared partial)
     ═══════════════════════════════════════════ */

  function renderRanksTab($body) {
    var perms = getUserPermissions();
    if (!perms.manageDepartments) {
      $body.html('<div class="dds-info"><i class="fa fa-info-circle"></i><span>You need the <strong>Manage Departments</strong> permission to manage ranks.</span></div>');
      return;
    }
    var tpl = document.getElementById('manage-ranks-tpl');
    if (!tpl || !tpl.content || !window.manageRanks) {
      $body.html('<div class="dds-warn"><i class="fa fa-exclamation-triangle"></i><span>Ranks management is unavailable. Reload the page and try again.</span></div>');
      return;
    }

    var c = cfg();
    var dept = getDept();

    // Mount a fresh clone of the partial markup. Cloning from a <template>
    // means the original IDs aren't in the live document, so this is safe.
    $body.empty();
    $body[0].appendChild(tpl.content.cloneNode(true));

    // Configure module (idempotent) then init for this department.
    // c.communityId is the URL-derived primitive string set at page boot;
    // c.communityData is the AJAX response whose embedded `community` object
    // doesn't carry an `_id`, so don't rely on community._id here.
    window.manageRanks.configure({
      communityId: c.communityId,
      userId: c.userId
    });
    window.manageRanks.init({
      deptId: dept._id,
      deptName: dept.name || ''
    });
  }

  /* ═══════════════════════════════════════════
     TAB 1: Settings
     ═══════════════════════════════════════════ */

  function renderSettingsTab($body) {
    var dept = getDept();
    var perms = getUserPermissions();
    var canEdit = perms.manageDepartments;
    var deptName = dept.name || '';
    var deptDesc = dept.description || '';
    var isPrivate = dept.approvalRequired === true;

    var html = '';

    html += '<div class="dds-section">';
    html += '<div class="dds-section-title-row"><span class="dds-section-title" style="margin-bottom:0;">General</span><span class="dds-autosave" id="dds-settings-status" style="opacity:0;"></span></div>';
    if (canEdit) {
      html += '<div class="dds-field">' +
          '<label class="dds-field-label">Department Name</label>' +
          '<input type="text" class="dds-input" id="dds-name" maxlength="50" value="' + esc(deptName) + '" />' +
        '</div>' +
        '<div class="dds-field">' +
          '<label class="dds-field-label">Description</label>' +
          '<textarea class="dds-textarea" id="dds-desc" maxlength="250" placeholder="Add a description...">' + esc(deptDesc) + '</textarea>' +
        '</div>';
    } else {
      html += '<div class="dds-field">' +
          '<label class="dds-field-label">Department Name</label>' +
          '<input type="text" class="dds-input" value="' + esc(deptName) + '" disabled />' +
        '</div>';
      if (deptDesc) {
        html += '<div class="dds-field">' +
            '<label class="dds-field-label">Description</label>' +
            '<textarea class="dds-textarea" disabled>' + esc(deptDesc) + '</textarea>' +
          '</div>';
      }
      html += '<div class="dds-info"><i class="fa fa-info-circle"></i><span>You need the <strong>Manage Departments</strong> permission to edit these settings.</span></div>';
    }
    html += '</div>';

    // Access
    html += '<div class="dds-section">';
    html += '<div class="dds-section-title-row"><span class="dds-section-title" style="margin-bottom:0;">Access</span><span class="dds-autosave" id="dds-privacy-status" style="opacity:0;"></span></div>';
    html += '<div class="dds-toggle-row" style="border-bottom:none;">' +
      '<div class="dds-toggle-info">' +
        '<span class="dds-toggle-label">Private Department</span>' +
        '<span class="dds-toggle-desc" id="dds-privacy-desc">' +
          (isPrivate ? 'Members must be approved to join' : 'All community members can access') +
        '</span>' +
      '</div>' +
      '<label class="dds-switch">' +
        '<input type="checkbox" id="dds-privacy"' + (isPrivate ? ' checked' : '') + (canEdit ? '' : ' disabled') + ' />' +
        '<span class="dds-switch-track"></span>' +
      '</label>' +
    '</div></div>';

    // Records — per-department civilian record-deletion lock. Visible to
    // everyone (so members can see whether their dept restricts deletion);
    // editable only with manage-departments permission. Civilian-template
    // depts only — that's where civilian dashboards live and the gate is
    // consulted; the flag is never read on police/fire/ems/dispatch depts.
    var isCivilianTemplate = dept.template && dept.template.name === 'Civilian';
    if (isCivilianTemplate) {
      var restrictRecords = dept.restrictCivilianRecordDeletion === true;
      html += '<div class="dds-section">';
      html += '<div class="dds-section-title-row"><span class="dds-section-title" style="margin-bottom:0;">Records</span><span class="dds-autosave" id="dds-records-status" style="opacity:0;"></span></div>';
      html += '<div class="dds-toggle-row" style="border-bottom:none;">' +
        '<div class="dds-toggle-info">' +
          '<span class="dds-toggle-label">Restrict civilian record deletion</span>' +
          '<span class="dds-toggle-desc" id="dds-records-desc">' +
            (restrictRecords
              ? "Civilians can't delete citations, written warnings, or arrest reports issued by this department"
              : 'Civilians can delete their own citations, written warnings, and arrest reports') +
          '</span>' +
        '</div>' +
        '<label class="dds-switch">' +
          '<input type="checkbox" id="dds-restrict-records"' + (restrictRecords ? ' checked' : '') + (canEdit ? '' : ' disabled') + ' />' +
          '<span class="dds-switch-track"></span>' +
        '</label>' +
      '</div></div>';
    }

    // Economy — per-department settings.
    // Always visible (so members can see how their pay is configured), editable
    // only with manage-departments permission. All money inputs are entered as
    // dollars and converted to cents at save-time.
    var economyEnabled = dept.economyEnabled === true;
    var basePayDollars = (typeof dept.basePayPerHour === 'number') ? (dept.basePayPerHour / 100) : 0;
    var maxSessionMinutes = (typeof dept.maxSessionMinutes === 'number' && dept.maxSessionMinutes > 0) ? dept.maxSessionMinutes : 120;
    var afkPromptSec = (typeof dept.afkPromptIntervalSeconds === 'number' && dept.afkPromptIntervalSeconds > 0) ? dept.afkPromptIntervalSeconds : 600;
    var afkGraceSec = (typeof dept.afkGraceSeconds === 'number' && dept.afkGraceSeconds > 0) ? dept.afkGraceSeconds : 60;
    var payoutMode = (dept.payoutMode === 'on_clockout') ? 'on_clockout' : 'on_heartbeat';
    var disAttr = canEdit ? '' : ' disabled';

    html += '<div class="dds-section">';
    html += '<div class="dds-section-title-row"><span class="dds-section-title" style="margin-bottom:0;">Economy</span><span class="dds-autosave" id="dds-economy-status" style="opacity:0;"></span></div>';
    html += '<div class="dds-toggle-row" style="border-bottom:none;">' +
      '<div class="dds-toggle-info">' +
        '<span class="dds-toggle-label">Enable economy for this department</span>' +
        '<span class="dds-toggle-desc" id="dds-economy-enabled-desc">' +
          (economyEnabled ? 'Members can clock in and earn pay' : 'Clock-in is disabled') +
        '</span>' +
      '</div>' +
      '<label class="dds-switch">' +
        '<input type="checkbox" id="dds-economy-enabled"' + (economyEnabled ? ' checked' : '') + disAttr + ' />' +
        '<span class="dds-switch-track"></span>' +
      '</label>' +
    '</div>';
    html += '<div id="dds-economy-fields" style="' + (economyEnabled ? '' : 'display:none;') + '">' +
      '<div class="dds-field">' +
        '<label class="dds-field-label">Base pay ($/hour)</label>' +
        '<input type="number" class="dds-input" id="dds-economy-base-pay" min="0" max="10000000" step="0.01" value="' + basePayDollars.toFixed(2) + '"' + disAttr + ' />' +
        '<div class="dds-field-hint">Range: $0 – $10,000,000</div>' +
        '<div class="dds-field-error">Must be between $0 and $10,000,000</div>' +
      '</div>' +
      '<div class="dds-field">' +
        '<label class="dds-field-label">Payout mode</label>' +
        '<select class="dds-input" id="dds-economy-payout-mode"' + disAttr + '>' +
          '<option value="on_heartbeat"' + (payoutMode === 'on_heartbeat' ? ' selected' : '') + '>On heartbeat (live)</option>' +
          '<option value="on_clockout"' + (payoutMode === 'on_clockout' ? ' selected' : '') + '>On clock-out only</option>' +
        '</select>' +
      '</div>' +
      '<div class="dds-field">' +
        '<label class="dds-field-label">Max session (minutes)</label>' +
        '<input type="number" class="dds-input" id="dds-economy-max-session" min="1" max="10080" step="1" value="' + maxSessionMinutes + '"' + disAttr + ' />' +
        '<div class="dds-field-hint">Range: 1 – 10,080 (1 week)</div>' +
        '<div class="dds-field-error">Must be a whole number between 1 and 10,080</div>' +
      '</div>' +
      '<div class="dds-field">' +
        '<label class="dds-field-label">AFK prompt interval (seconds)</label>' +
        '<input type="number" class="dds-input" id="dds-economy-afk-prompt" min="30" max="86400" step="1" value="' + afkPromptSec + '"' + disAttr + ' />' +
        '<div class="dds-field-hint">Range: 30 – 86,400 (1 day)</div>' +
        '<div class="dds-field-error">Must be a whole number between 30 and 86,400</div>' +
      '</div>' +
      '<div class="dds-field">' +
        '<div class="dds-label-row">' +
          '<label class="dds-field-label">AFK grace (seconds)</label>' +
          '<button type="button" class="dds-help-btn" data-help="afkGrace" aria-label="What is AFK grace?">' +
            '<i class="fa-regular fa-circle-question"></i>' +
          '</button>' +
        '</div>' +
        '<input type="number" class="dds-input" id="dds-economy-afk-grace" min="10" max="86400" step="1" value="' + afkGraceSec + '"' + disAttr + ' />' +
        '<div class="dds-field-hint">Range: 10 – 86,400 (1 day)</div>' +
        '<div class="dds-field-error">Must be a whole number between 10 and 86,400</div>' +
      '</div>' +
    '</div>';
    html += '</div>';

    // Sound settings
    var soundEnabled = window.dbUser && window.dbUser.user && window.dbUser.user.panicButtonSound;
    var cadAlertEnabled = !!(window.dbUser && window.dbUser.user && window.dbUser.user.alertSoundsEnabled === true);
    var volumeLevel = (window.dbUser && window.dbUser.user && window.dbUser.user.alertVolumeLevel != null) ? window.dbUser.user.alertVolumeLevel : 50;

    html += '<div class="dds-section">';
    html += '<div class="dds-section-title-row"><span class="dds-section-title" style="margin-bottom:0;">Sound</span><span class="dds-autosave" id="dds-sound-status" style="opacity:0;"></span></div>';
    html += '<div class="dds-toggle-row" style="padding:14px 16px;border-radius:12px;background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.04);margin-bottom:1rem;">' +
      '<div class="dds-toggle-info">' +
        '<span class="dds-toggle-label">Alert Sounds</span>' +
        '<span class="dds-toggle-desc">Panic alerts, Signal 100 & emergency tones</span>' +
      '</div>' +
      '<label class="dds-switch">' +
        '<input type="checkbox" id="dds-sound-toggle"' + (soundEnabled ? ' checked' : '') + ' />' +
        '<span class="dds-switch-track"></span>' +
      '</label>' +
    '</div>';
    // CAD alert sounds — the newer opt-in tones (new 911 calls / warrant hits /
    // unit attach). Separate field + toggle from the panic/emergency sound above.
    html += '<div class="dds-toggle-row" style="padding:14px 16px;border-radius:12px;background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.04);margin-bottom:1rem;">' +
      '<div class="dds-toggle-info">' +
        '<span class="dds-toggle-label">CAD Alert Sounds</span>' +
        '<span class="dds-toggle-desc">New 911 calls, warrant hits &amp; unit attach tones</span>' +
      '</div>' +
      '<label class="dds-switch">' +
        '<input type="checkbox" id="dds-cad-alert-toggle"' + (cadAlertEnabled ? ' checked' : '') + ' />' +
        '<span class="dds-switch-track"></span>' +
      '</label>' +
    '</div>';
    html += '<div style="margin-bottom:0;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">' +
        '<span style="color:var(--dd-text);font-size:0.8125rem;font-weight:500;">Alert Volume</span>' +
        '<span id="dds-vol-display" style="font-size:0.8125rem;font-weight:600;color:var(--dd-accent);background:rgba(56,189,248,0.1);padding:2px 10px;border-radius:6px;min-width:42px;text-align:center;font-variant-numeric:tabular-nums;">' + esc(String(volumeLevel)) + '%</span>' +
      '</div>' +
      '<div class="dds-slider-wrap">' +
        '<input type="range" id="dds-volume-slider" min="0" max="100" value="' + esc(String(volumeLevel)) + '" />' +
      '</div>' +
      '<div class="dds-volume-bars" id="dds-volume-bars"></div>' +
    '</div>';
    html += '</div>';

    $body.html(html);

    // Build volume bars visualization
    var barCount = 20;
    var barsContainer = document.getElementById('dds-volume-bars');
    if (barsContainer) {
      for (var bi = 0; bi < barCount; bi++) {
        var bar = document.createElement('span');
        bar.style.height = (3 + (bi / barCount) * 15) + 'px';
        barsContainer.appendChild(bar);
      }
    }

    function updateVolumeBars(val) {
      if (!barsContainer) return;
      var bars = barsContainer.children;
      var filled = Math.round((val / 100) * barCount);
      for (var i = 0; i < bars.length; i++) {
        if (i < filled) {
          bars[i].classList.add('active');
          bars[i].classList.toggle('bright', i >= filled - 3);
        } else {
          bars[i].classList.remove('active', 'bright');
        }
      }
      // Update slider track fill
      var slider = document.getElementById('dds-volume-slider');
      if (slider) {
        var pct = val + '%';
        slider.style.background = 'linear-gradient(to right, rgba(56,189,248,0.35) 0%, rgba(56,189,248,0.5) ' + pct + ', #1e2235 ' + pct + ')';
      }
    }
    updateVolumeBars(volumeLevel);

    // Sound toggle handler — emit socket event directly
    $body.find('#dds-sound-toggle').on('change', function () {
      showSaveStatus('#dds-sound-status', 'saving');
      var socket = io({ transports: ['websocket'] });
      socket.emit('update_panic_btn_sound', window.dbUser);
      socket.on('load_panic_btn_result', function(res) {
        var newVal = !res.user.panicButtonSound;
        window.dbUser.user.panicButtonSound = newVal;
        $('#dds-sound-toggle').prop('checked', newVal);
        $('#panic-button-check-sound').prop('checked', newVal);
        showSaveStatus('#dds-sound-status', 'saved');
      });
    });

    // CAD alert sounds toggle — persists straight to the user API (the single
    // source of truth shared with mobile), unlike the socket-based panic toggle.
    $body.find('#dds-cad-alert-toggle').on('change', function () {
      var enabled = this.checked;
      var userId = window.dbUser && window.dbUser._id;
      if (!userId) return;
      showSaveStatus('#dds-sound-status', 'saving');
      var base = (window.resolveAlertApiBase && window.resolveAlertApiBase())
        || (window.ddConfig && window.ddConfig.API_URL) || '';
      fetch(base + '/api/v1/user/' + encodeURIComponent(userId) + '/alert-sounds-enabled', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: enabled })
      }).then(function (res) {
        if (!res.ok) throw new Error('request failed');
        window.dbUser.user.alertSoundsEnabled = enabled;
        $('#alert-sounds-check').prop('checked', enabled); // keep legacy checkbox in sync if present
        showSaveStatus('#dds-sound-status', 'saved');
      }).catch(function () {
        $('#dds-cad-alert-toggle').prop('checked', !enabled); // revert on failure
        showSaveStatus('#dds-sound-status', 'error', 'Could not save');
      });
    });

    // Volume slider handler — preview only on click and release, not every drag tick
    $body.find('#dds-volume-slider').on('input', function () {
      $('#dds-vol-display').text(this.value + '%');
      updateVolumeBars(this.value);
    });
    $body.find('#dds-volume-slider').on('click', function () {
      if (window.AlertSounds) window.AlertSounds.preview('signal100', this.value);
    });
    $body.find('#dds-volume-slider').on('change', function () {
      var vol = this.value;
      showSaveStatus('#dds-sound-status', 'saving');
      var socket = io({ transports: ['websocket'] });
      socket.emit('update_alert_volume_slider', { dbUser: window.dbUser, volume: vol });
      socket.on('load_alert_volume_result', function() {
        window.dbUser.user.alertVolumeLevel = vol;
        showSaveStatus('#dds-sound-status', 'saved');
      });
      // Sync legacy slider if it exists
      var legacySlider = document.getElementById('alert-volume-slider');
      if (legacySlider) legacySlider.value = vol;
      if (window.AlertSounds) window.AlertSounds.preview('signal100', vol);
    });

    // Track original values to only save when changed
    var origName = deptName;
    var origDesc = deptDesc;
    var origPriv = isPrivate;

    // Debounced auto-save for text fields
    if (canEdit) {
      $body.find('#dds-name, #dds-desc').on('input', function () {
        debounceSave('settings', function () {
          autoSaveSettings('#dds-settings-status');
        }, DEBOUNCE_MS);
      });

      // Immediate save on privacy toggle
      $body.find('#dds-privacy').on('change', function () {
        var v = $(this).is(':checked');
        $('#dds-privacy-desc').text(v ? 'Members must be approved to join' : 'All community members can access');
        autoSavePrivacy(v);
      });

      // Immediate save on the records-restriction toggle
      $body.find('#dds-restrict-records').on('change', function () {
        var v = $(this).is(':checked');
        $('#dds-records-desc').text(v
          ? "Civilians can't delete citations, written warnings, or arrest reports issued by this department"
          : 'Civilians can delete their own citations, written warnings, and arrest reports');
        autoSaveRestrictRecords(v);
      });

      // Economy — show/hide nested fields when master toggle flips; save immediately.
      $body.find('#dds-economy-enabled').on('change', function () {
        var on = $(this).is(':checked');
        $('#dds-economy-fields').toggle(on);
        $('#dds-economy-enabled-desc').text(on ? 'Members can clock in and earn pay' : 'Clock-in is disabled');
        autoSaveEconomy();
      });
      // Real-time validation: paint the input red and show the inline error
      // when the value is out of [min, max], and SKIP the autosave debounce so
      // a typo never silently makes it to the server clamp.
      $body.find('#dds-economy-base-pay, #dds-economy-max-session, #dds-economy-afk-prompt, #dds-economy-afk-grace').on('input blur', function () {
        var v = parseFloat(this.value);
        var lo = parseFloat(this.min);
        var hi = parseFloat(this.max);
        var invalid = this.value === '' || !isFinite(v) || v < lo || v > hi;
        var $field = $(this).closest('.dds-field');
        $(this).toggleClass('is-invalid', invalid);
        $field.toggleClass('has-error', invalid);
        if (!invalid) {
          debounceSave('economy', autoSaveEconomy, DEBOUNCE_MS);
        }
      });
      $body.find('#dds-economy-payout-mode').on('change', function () {
        autoSaveEconomy();
      });
      // Field-help (?) icons → ddModal explainer
      $body.find('[data-help]').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        showDdsFieldHelp(this.getAttribute('data-help'));
      });
    }
  }

  // Plain-language explainers shown when the user clicks a help (?) icon
  // next to a field label. Add an entry here + data-help="key" on the
  // <button> to wire up a new one.
  var DDS_FIELD_HELP = {
    afkGrace: {
      title: 'What is AFK grace?',
      message: 'After the AFK prompt appears, members have this many seconds to confirm they\'re still active. If they don\'t respond in time, they\'re automatically clocked out and stop earning pay.',
      detail: 'Example: with AFK prompt every 600s and AFK grace 60s, members are pinged every 10 minutes and have 1 minute to confirm. Otherwise their session ends.',
    },
  };
  function showDdsFieldHelp(key) {
    var help = DDS_FIELD_HELP[key];
    if (!help || typeof window.ddModal !== 'function') return;
    window.ddModal({
      type: 'info',
      icon: 'fa-circle-question',
      title: help.title,
      message: help.message,
      detail: help.detail,
      buttons: [{ label: 'Got it', class: 'dd-modal-btn-primary' }],
    });
  }

  /** Save per-department economy settings. Money entered as dollars; persisted as cents. */
  function autoSaveEconomy() {
    var c = cfg();
    var dept = getDept();
    var enabled = $('#dds-economy-enabled').is(':checked');
    var basePayDollars = parseFloat($('#dds-economy-base-pay').val());
    if (!isFinite(basePayDollars) || basePayDollars < 0) basePayDollars = 0;
    if (basePayDollars > 10000000) basePayDollars = 10000000; // $10M/hr dollar cap
    var basePayCents = Math.round(basePayDollars * 100);
    var maxSession = parseInt($('#dds-economy-max-session').val(), 10);
    if (!isFinite(maxSession) || maxSession < 1) maxSession = 120;
    if (maxSession > 24 * 60 * 7) maxSession = 24 * 60 * 7;
    var afkPrompt = parseInt($('#dds-economy-afk-prompt').val(), 10);
    if (!isFinite(afkPrompt) || afkPrompt < 30) afkPrompt = 600;
    if (afkPrompt > 86400) afkPrompt = 86400;
    var afkGrace = parseInt($('#dds-economy-afk-grace').val(), 10);
    if (!isFinite(afkGrace) || afkGrace < 10) afkGrace = 60;
    if (afkGrace > 86400) afkGrace = 86400;
    var payoutMode = $('#dds-economy-payout-mode').val() === 'on_clockout' ? 'on_clockout' : 'on_heartbeat';

    showSaveStatus('#dds-economy-status', 'saving');

    $.ajax({
      url: c.API_URL + '/api/v1/community/' + c.communityId + '/departments/' + c.departmentId + '?userId=' + (window.dbUser && window.dbUser._id || ''),
      method: 'PATCH',
      contentType: 'application/json',
      data: JSON.stringify({
        economyEnabled: enabled,
        basePayPerHour: basePayCents,
        maxSessionMinutes: maxSession,
        afkPromptIntervalSeconds: afkPrompt,
        afkGraceSeconds: afkGrace,
        payoutMode: payoutMode,
      }),
      success: function () {
        dept.economyEnabled = enabled;
        dept.basePayPerHour = basePayCents;
        dept.maxSessionMinutes = maxSession;
        dept.afkPromptIntervalSeconds = afkPrompt;
        dept.afkGraceSeconds = afkGrace;
        dept.payoutMode = payoutMode;
        showSaveStatus('#dds-economy-status', 'saved');
      },
      error: function () {
        showSaveStatus('#dds-economy-status', 'error', 'Save failed');
      }
    });
  }

  /** Auto-save settings (name + description). Called after debounce. */
  function autoSaveSettings(statusSelector) {
    var c = cfg();
    var name = $.trim($('#dds-name').val());
    var desc = $.trim($('#dds-desc').val());
    var priv = $('#dds-privacy').is(':checked');

    if (!name) {
      showSaveStatus(statusSelector, 'error', 'Name required');
      return;
    }

    // Skip if nothing changed
    var dept = getDept();
    if (name === (dept.name || '') && desc === (dept.description || '') && priv === (dept.approvalRequired === true)) {
      return;
    }

    showSaveStatus(statusSelector, 'saving');

    $.ajax({
      url: c.API_URL + '/api/v1/community/' + c.communityId + '/departments/' + c.departmentId,
      method: 'PATCH',
      contentType: 'application/json',
      data: JSON.stringify({ name: name, description: desc, approvalRequired: priv }),
      success: function () {
        dept.name = name;
        dept.description = desc;
        dept.approvalRequired = priv;
        $('.dd-sidebar-dept').text(name);
        $('.dds-dept-name').text(name);
        showSaveStatus(statusSelector, 'saved');
      },
      error: function () {
        showSaveStatus(statusSelector, 'error', 'Save failed');
      }
    });
  }

  /** Immediate auto-save for the records-restriction toggle only. */
  function autoSaveRestrictRecords(restrict) {
    var c = cfg();
    var dept = getDept();
    showSaveStatus('#dds-records-status', 'saving');
    $.ajax({
      url: c.API_URL + '/api/v1/community/' + c.communityId + '/departments/' + c.departmentId + '?userId=' + (window.dbUser && window.dbUser._id || ''),
      method: 'PATCH',
      contentType: 'application/json',
      data: JSON.stringify({ restrictCivilianRecordDeletion: restrict }),
      success: function () {
        dept.restrictCivilianRecordDeletion = restrict;
        // Keep the global cache used by canDeleteCivilianRecords in sync so the
        // delete button visibility updates without a full reload.
        var cached = window.communityDepartmentsCached || [];
        for (var i = 0; i < cached.length; i++) {
          var d = cached[i];
          if (d && (d._id || d.id) === c.departmentId) {
            d.restrictCivilianRecordDeletion = restrict;
            break;
          }
        }
        showSaveStatus('#dds-records-status', 'saved');
      },
      error: function () {
        showSaveStatus('#dds-records-status', 'error', 'Save failed');
      }
    });
  }

  /** Immediate auto-save for the privacy toggle only. */
  function autoSavePrivacy(isPrivate) {
    var c = cfg();
    var dept = getDept();
    var name = $.trim($('#dds-name').val()) || dept.name || '';
    var desc = $.trim($('#dds-desc').val());
    if (desc === undefined || desc === null) desc = dept.description || '';

    showSaveStatus('#dds-privacy-status', 'saving');

    $.ajax({
      url: c.API_URL + '/api/v1/community/' + c.communityId + '/departments/' + c.departmentId,
      method: 'PATCH',
      contentType: 'application/json',
      data: JSON.stringify({ name: name, description: desc, approvalRequired: isPrivate }),
      success: function () {
        dept.name = name;
        dept.description = desc;
        dept.approvalRequired = isPrivate;
        showSaveStatus('#dds-privacy-status', 'saved');
      },
      error: function () {
        showSaveStatus('#dds-privacy-status', 'error', 'Save failed');
      }
    });
  }

  /* ═══════════════════════════════════════════
     TAB 2: Components
     ═══════════════════════════════════════════ */

  var compDisplayNames = {
    createCivilians:       'Civilians',
    createVehicles:        'Vehicles',
    createFirearms:        'Firearms',
    call911:               'Call 911',
    notepad:               'Notepad',
    '10CodesInterface':    'Status Codes',
    personSearch:          'Person Search',
    vehicleSearch:         'Vehicle Search',
    firearmSearch:         'Firearm Search',
    createBolos:           'BOLOs',
    viewBolosAndWarrants:  'Warrant Database',
    dispatchUnits:         'Dispatch Units',
    createAndManageCalls:  'Calls for Service',
    manage911Calls:        'Manage 911 Calls',
    nameSearch:            'Name Search',
    reviewWarrants:        'Review Warrants',
    allWarrants:           'All Warrants',
    penalCodes:            'Penal Codes',
    courtCases:            'Court Cases',
    activeCalls:           'Calls',
    warrantDatabase:       'Warrant Database',
    medicalDatabase:       'Medical Database'
  };

  var requiredComponents = {
    ems:      ['medicalDatabase'],
    fire:     ['medicalDatabase'],
    judicial: ['reviewWarrants']
  };

  // Cache for resolved template components fetched from the backend.
  // Populated once per page load by fetchTemplateDefaults().
  var _templateDefaultsCache = null;

  /**
   * Fetch the canonical component list for each template type from the backend.
   * Returns a promise-like jQuery deferred that resolves with a map:
   *   { civilian: [{name, enabled}], police: [...], ... }
   * Results are cached so only one request is made per page load.
   */
  function fetchTemplateDefaults() {
    if (_templateDefaultsCache) {
      return $.Deferred().resolve(_templateDefaultsCache).promise();
    }
    var c = cfg();
    return $.ajax({
      url: c.API_URL + '/api/v1/templates/defaults/resolved',
      method: 'GET'
    }).then(function (res) {
      _templateDefaultsCache = res.templates || {};
      return _templateDefaultsCache;
    });
  }

  /**
   * Merge the department's stored components with the canonical template
   * component list from the backend.
   * Returns a unified list where stored data takes precedence for enabled
   * state, but any missing canonical components are added (as disabled).
   *
   * @param {Object} template  The department's template object ({name, components})
   * @param {Array}  canonical Array of {name, enabled} from the resolved backend
   */
  function getMergedComponents(template, canonical) {
    var apiComps = template.components || [];

    // Index department's stored components by name
    var byName = {};
    apiComps.forEach(function (c) { if (c.name) byName[c.name] = c; });

    // Build merged list: start with stored components in their order
    var merged = [];
    apiComps.forEach(function (c) { merged.push(c); });

    // Append any canonical components missing from the stored data
    if (canonical && canonical.length) {
      canonical.forEach(function (def) {
        if (def.name && !byName[def.name]) {
          merged.push({ name: def.name, enabled: def.enabled || false, _missing: true });
        }
      });
    }

    return merged;
  }

  function renderComponentsTab($body) {
    var dept = getDept();
    var template = dept.template || {};
    var tplName = (template.name || '').toLowerCase();

    // Show loading while fetching canonical component list from backend
    $body.html('<div style="text-align:center;padding:2rem;color:var(--dd-text-muted);"><i class="fa fa-spinner fa-spin"></i> Loading components...</div>');

    fetchTemplateDefaults().then(function (defaults) {
      var canonical = defaults[tplName] || [];
      buildComponentsUI($body, template, tplName, getMergedComponents(template, canonical), false);
    }).fail(function () {
      // Fallback: render with just stored components if backend call fails
      buildComponentsUI($body, template, tplName, getMergedComponents(template, []), true);
    });
  }

  /**
   * Builds the component toggle UI once we have the merged component list.
   * @param {boolean} degraded  True if we failed to load template defaults
   */
  function buildComponentsUI($body, template, tplName, components, degraded) {
    if (!components.length) {
      $body.html('<div class="dds-section"><div class="dds-info"><i class="fa fa-info-circle"></i><span>No components found for this department template.</span></div></div>');
      return;
    }

    var required = requiredComponents[tplName] || [];

    var html = '<div class="dds-section">';
    html += '<div class="dds-section-title-row"><span class="dds-section-title" style="margin-bottom:0;">Toggle components on or off</span><span class="dds-autosave" id="dds-comp-status" style="opacity:0;"></span></div>';
    if (degraded) {
      html += '<div class="dds-warn"><i class="fa fa-exclamation-triangle"></i><span>Could not load template defaults. Showing stored components only.</span></div>';
    } else {
      html += '<div class="dds-info"><i class="fa fa-info-circle"></i><span>Changes are saved automatically and reflected in the sidebar.</span></div>';
    }
    html += '<div class="dds-comp-list">';

    components.forEach(function (comp, idx) {
      var compName = comp.name || '';
      var display = compDisplayNames[compName] || compName;
      var enabled = comp.enabled !== false;
      var isReq = required.indexOf(compName) !== -1;

      html += '<div class="dds-comp-row">' +
        '<span class="dds-drag-handle"><i class="fa fa-grip-vertical"></i></span>' +
        '<div style="flex:1;"><span class="dds-comp-name">' + esc(display) + '</span>' +
          (isReq ? '<span class="dds-comp-required">Required</span>' : '') +
        '</div>' +
        '<label class="dds-switch">' +
          '<input type="checkbox" data-comp-idx="' + idx + '" data-comp-name="' + esc(compName) + '"' +
            (enabled ? ' checked' : '') + (isReq ? ' disabled' : '') + ' />' +
          '<span class="dds-switch-track"></span>' +
        '</label></div>';
    });

    html += '</div></div>';

    $body.html(html);
    $body.data('mergedComponents', components);

    // Auto-save on toggle change (debounced to batch rapid toggles)
    $body.find('.dds-comp-row input[type="checkbox"]').on('change', function () {
      debounceSave('components', function () { autoSaveComponents(); }, 400);
    });

    // Drag-to-reorder via SortableJS
    var listEl = $body.find('.dds-comp-list')[0];
    if (listEl && typeof Sortable !== 'undefined') {
      Sortable.create(listEl, {
        handle: '.dds-drag-handle',
        animation: 200,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        onEnd: function () {
          debounceSave('components', function () { autoSaveComponents(); }, 400);
        }
      });
    }
  }

  function autoSaveComponents() {
    var c = cfg();
    var dept = getDept();
    var template = dept.template || {};
    var $tabBody = $('#dds-tab-body');
    var merged = $tabBody.data('mergedComponents') || [];

    var updated = [];
    $tabBody.find('.dds-comp-row input[type="checkbox"]').each(function () {
      var idx = parseInt($(this).data('comp-idx'), 10);
      var comp = merged[idx];
      if (!comp) return;
      var entry = {
        name: comp.name || '',
        enabled: $(this).is(':checked')
      };
      // Only include _id if it's a real ObjectID (not empty / missing component)
      var compId = comp._id || comp.id || '';
      if (compId && compId !== '000000000000000000000000') {
        entry._id = compId;
      }
      updated.push(entry);
    });

    showSaveStatus('#dds-comp-status', 'saving');

    $.ajax({
      url: c.API_URL + '/api/v1/community/' + c.communityId + '/departments/' + c.departmentId + '/components',
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({ components: updated }),
      success: function () {
        template.components = updated;
        showSaveStatus('#dds-comp-status', 'saved');

        // Live-update sidebar and enabledComponents so changes are reflected
        // without requiring a page refresh
        syncEnabledComponents(updated);
      },
      error: function () {
        showSaveStatus('#dds-comp-status', 'error', 'Save failed');
      }
    });
  }

  /**
   * Sync the global enabledComponents map and rebuild the sidebar
   * after component toggles change. Also adds/removes cards from the
   * overview panel for newly enabled/disabled components.
   */
  // Map backend template component names to frontend registry keys where they differ
  var templateToRegistryMap = { viewBolosAndWarrants: 'warrantDatabase' };

  function syncEnabledComponents(updated) {
    // Access the global enabledComponents from the dashboard scope
    if (!window.ddConfig || !window.ddConfig._enabledComponents) return;
    var ec = window.ddConfig._enabledComponents;
    var registry = window.ddConfig._componentRegistry;
    if (!registry) return;

    updated.forEach(function (comp) {
      if (!comp.name) return;
      var regKey = templateToRegistryMap[comp.name] || comp.name;
      var wasEnabled = !!ec[regKey];
      var nowEnabled = comp.enabled;

      if (nowEnabled && !wasEnabled) {
        // Newly enabled — add to map
        ec[regKey] = true;
        // Add card to overview grid if component exists in registry
        if (registry[regKey]) {
          var regComp = registry[regKey];
          var $grid = $('#dd-panel-overview .dd-grid');
          if ($grid.length && !$('#dd-component-' + regKey).length) {
            var $card = $('<div class="dd-card ' + regComp.gridClass + ' dd-animate-in" id="dd-component-' + regKey + '" style="--card-accent:' + regComp.accentColor + ';"></div>');
            $card.html(regComp.render(regKey));
            if (regComp.overviewHidden) $card.addClass('dd-overview-hidden');
            // If we're in a focused view (not overview), hide the new card
            // so it doesn't appear below the current panel
            var activePanel = $('.dd-nav-item.active').data('panel');
            if (activePanel && activePanel !== 'overview') $card.hide();
            $grid.append($card);
            if (regComp.init) regComp.init();
          }
        }
      } else if (!nowEnabled && wasEnabled) {
        // Disabled — remove card and nav item
        $('#dd-component-' + regKey).remove();
        ec[regKey] = false;
      }
    });

    // Always keep departmentSettings enabled
    ec['departmentSettings'] = true;

    // Rebuild sidebar nav to reflect changes
    if (typeof window.ddBuildSidebarNav === 'function') {
      window.ddBuildSidebarNav();
    }
  }

  /* ═══════════════════════════════════════════
     TAB 3: Members
     ═══════════════════════════════════════════ */

  var membersPage = 1;
  var membersData = [];
  var membersTotalCount = 0;
  var membersLimit = 10;
  var membersSearch = '';
  var membersSearchTimer = null;
  var membersRequestId = 0;

  function renderMembersTab($body) {
    var dept = getDept();
    var isPrivate = dept.approvalRequired === true;

    if (!isPrivate) {
      $body.html(
        '<div class="dds-section">' +
          '<div class="dds-info"><i class="fa fa-info-circle"></i>' +
            '<span>This department is set to <strong>public</strong>. All community members can access it, so individual membership management is not needed.</span>' +
          '</div>' +
          '<div class="dds-members-empty">Switch to a private department in the Settings tab to manage individual members.</div>' +
        '</div>'
      );
      return;
    }

    membersPage = 1;
    membersData = [];
    membersSearch = '';
    if (membersSearchTimer) { clearTimeout(membersSearchTimer); membersSearchTimer = null; }
    $body.html(
      '<div class="dds-section">' +
        '<div class="dds-section-title">Department Members</div>' +
        '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;">' +
          '<div style="position:relative;flex:1;">' +
            '<i class="fa fa-search" style="position:absolute;left:0.75rem;top:50%;transform:translateY(-50%);color:var(--dd-text-muted);font-size:0.75rem;pointer-events:none;"></i>' +
            '<input type="text" class="dds-input" id="dds-members-search" placeholder="Search members..." style="padding-left:2rem;" autocomplete="off" />' +
          '</div>' +
          '<button class="dds-btn dds-btn-secondary" id="dds-add-members-btn"><i class="fa fa-plus"></i> Add Members</button>' +
        '</div>' +
        '<div id="dds-members-list"><div style="text-align:center;padding:1rem;color:var(--dd-text-muted);"><i class="fa fa-spinner fa-spin"></i> Loading...</div></div>' +
      '</div>'
    );

    loadMembers();

    $body.find('#dds-add-members-btn').on('click', function () { openAddMembersModal(); });

    $body.find('#dds-members-search').on('input', function () {
      var v = this.value || '';
      // Debounce 300ms — matches the community-members search modal cadence.
      if (membersSearchTimer) clearTimeout(membersSearchTimer);
      membersSearchTimer = setTimeout(function () {
        membersSearch = v.trim();
        membersPage = 1;
        membersData = [];
        $('#dds-members-list').html('<div style="text-align:center;padding:1rem;color:var(--dd-text-muted);"><i class="fa fa-spinner fa-spin"></i> Loading...</div>');
        loadMembers();
      }, 300);
    });
  }

  function loadMembers() {
    var c = cfg();
    var url = c.API_URL + '/api/v1/community/' + c.communityId + '/departments/' + c.departmentId + '/members?limit=' + membersLimit + '&page=' + membersPage;
    if (membersSearch) {
      url += '&search=' + encodeURIComponent(membersSearch);
    }
    var requestId = ++membersRequestId;

    $.ajax({
      url: url,
      method: 'GET',
      success: function (res) {
        // Drop stale responses if a newer search has fired since.
        if (requestId !== membersRequestId) return;
        var newMembers = res.data || [];
        membersTotalCount = res.totalCount || 0;

        if (membersPage === 1) {
          membersData = newMembers;
        } else {
          membersData = membersData.concat(newMembers);
        }
        renderMembersList();
      },
      error: function () {
        if (requestId !== membersRequestId) return;
        $('#dds-members-list').html('<div class="dds-members-empty">Failed to load members</div>');
      }
    });
  }

  function renderMembersList() {
    var c = cfg();
    var perms = getUserPermissions();
    var canKick = perms.manageMembers || perms.isAdmin;
    var $list = $('#dds-members-list');

    if (!membersData.length) {
      $list.html(
        '<div class="dds-members-empty">' +
          (membersSearch ? 'No members match "' + esc(membersSearch) + '"' : 'No members found') +
        '</div>'
      );
      return;
    }

    var html = '<div style="font-size:0.6875rem;color:var(--dd-text-muted);margin-bottom:0.5rem;">' +
      membersTotalCount + ' member' + (membersTotalCount !== 1 ? 's' : '') + '</div>';

    membersData.forEach(function (m) {
      var user = m.user || {};
      var name = user.username || m.username || m.userID || 'Unknown';
      var pic = user.profilePicture || '';
      var userId = user.userID || m._id || '';
      var isMe = userId === c.userId;
      var avatarInner = pic
        ? '<img src="' + esc(pic) + '" alt="" />'
        : initials(name);

      html += '<div class="dds-member" data-user-id="' + esc(userId) + '">' +
        '<div class="dds-member-avatar">' + avatarInner + '</div>' +
        '<div class="dds-member-info">' +
          '<span class="dds-member-name">' + esc(name) +
            (isMe ? ' <span class="dds-member-you">(you)</span>' : '') +
          '</span>' +
        '</div>';
      if (canKick && !isMe) {
        html += '<div class="dds-member-actions">' +
          '<button class="dds-member-btn" data-kick="' + esc(userId) + '" data-kick-name="' + esc(name) + '" title="Remove from department"><i class="fa fa-xmark"></i></button>' +
        '</div>';
      }
      html += '</div>';
    });

    if (membersData.length < membersTotalCount) {
      html += '<div class="dds-load-more"><button class="dds-load-more-btn" id="dds-load-more-members">Load More</button></div>';
    }

    $list.html(html);

    $list.find('[data-kick]').on('click', function () {
      confirmKickMember($(this).data('kick'), $(this).data('kick-name'));
    });

    $list.find('#dds-load-more-members').on('click', function () {
      membersPage++;
      $(this).html('<i class="fa fa-spinner fa-spin"></i>').prop('disabled', true);
      loadMembers();
    });
  }

  function initials(name) {
    if (!name) return '?';
    var parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  }

  function confirmKickMember(userId, username) {
    if (!window.ddModal) {
      if (!confirm('Remove ' + username + ' from this department?')) return;
      kickMember(userId);
      return;
    }

    window.ddModal({
      title: 'Remove Member',
      message: 'Are you sure you want to remove <strong>' + esc(username) + '</strong> from this department?',
      detail: 'They will be able to request to join again.',
      type: 'warning',
      icon: 'fa-user-xmark',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      onConfirm: function () { kickMember(userId); }
    });
  }

  function kickMember(userId) {
    var c = cfg();

    $.ajax({
      url: c.API_URL + '/api/v1/community/' + c.communityId + '/departments/' + c.departmentId + '/remove-user',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ userId: userId }),
      success: function () {
        toast('Member removed', 'success');
        membersData = membersData.filter(function (m) {
          return ((m.user && m.user.userID) || m._id || '') !== userId;
        });
        membersTotalCount = Math.max(0, membersTotalCount - 1);
        renderMembersList();
      },
      error: function () { toast('Failed to remove member', 'error'); }
    });
  }

  /* ── Add Members Modal ── */

  var addMembersOverlay = null;
  var selectedMemberIds = [];
  var allCommunityMembers = [];
  var communityMembersPage = 1;
  var communityMembersLimit = 20;
  var communityMembersTotal = 0;
  var communityMembersSearch = '';
  var communityMembersLoading = false;
  var communityMembersHasMore = false;
  var communityMembersRequestId = 0;
  var communityMembersSearchTimer = null;

  function openAddMembersModal() {
    if (!addMembersOverlay) {
      var html = '' +
        '<div class="dds-add-overlay" id="dds-add-overlay">' +
          '<div class="dds-add-panel">' +
            '<div class="dds-add-header">' +
              '<span class="dds-add-title">Add Members</span>' +
              '<button class="dds-add-close" id="dds-add-close"><i class="fa fa-times"></i></button>' +
            '</div>' +
            '<div class="dds-add-body" id="dds-add-body">' +
              '<input type="text" class="dds-add-search" id="dds-add-search" placeholder="Search members..." />' +
              '<div id="dds-add-list"><div class="dds-add-loading"><i class="fa fa-spinner fa-spin"></i> Loading community members...</div></div>' +
            '</div>' +
            '<div class="dds-add-footer">' +
              '<button class="dds-btn dds-btn-secondary" id="dds-add-cancel">Cancel</button>' +
              '<button class="dds-btn dds-btn-primary" id="dds-add-confirm" disabled><i class="fa fa-plus"></i> Add (0)</button>' +
            '</div>' +
          '</div>' +
        '</div>';

      $('body').append(html);
      addMembersOverlay = $('#dds-add-overlay');

      addMembersOverlay.on('click', function (e) {
        if ($(e.target).is(addMembersOverlay)) closeAddMembersModal();
      });
      addMembersOverlay.on('click', '#dds-add-close, #dds-add-cancel', function () {
        closeAddMembersModal();
      });
    }

    // Force display in case transition doesn't fire
    addMembersOverlay.css('display', 'flex');
    setTimeout(function() { addMembersOverlay.addClass('visible'); }, 10);
    selectedMemberIds = [];
    communityMembersPage = 1;
    communityMembersTotal = 0;
    communityMembersSearch = '';
    communityMembersHasMore = false;
    allCommunityMembers = [];
    if (communityMembersSearchTimer) { clearTimeout(communityMembersSearchTimer); communityMembersSearchTimer = null; }
    loadCommunityMembers();

    addMembersOverlay.find('#dds-add-search').val('').off('input').on('input', function () {
      var q = ($(this).val() || '').trim();
      if (communityMembersSearchTimer) clearTimeout(communityMembersSearchTimer);
      communityMembersSearchTimer = setTimeout(function () {
        communityMembersSearch = q;
        communityMembersPage = 1;
        allCommunityMembers = [];
        $('#dds-add-list').html('<div class="dds-add-loading"><i class="fa fa-spinner fa-spin"></i> Searching...</div>');
        loadCommunityMembers();
      }, 300);
    });

    addMembersOverlay.find('#dds-add-confirm').off('click').on('click', function () {
      addSelectedMembers();
    });

    // Infinite scroll on the modal body
    var $body = addMembersOverlay.find('#dds-add-body');
    $body.off('scroll').on('scroll', function () {
      var el = this;
      if (communityMembersLoading || !communityMembersHasMore) return;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
        communityMembersPage++;
        loadCommunityMembers();
      }
    });
  }

  function closeAddMembersModal() {
    if (addMembersOverlay) {
      addMembersOverlay.removeClass('visible');
      setTimeout(function() { addMembersOverlay.css('display', 'none'); }, 300);
    }
  }

  function loadCommunityMembers() {
    var c = cfg();
    var requestId = ++communityMembersRequestId;
    communityMembersLoading = true;

    var url;
    if (communityMembersSearch) {
      url = c.API_URL + '/api/v1/community/' + c.communityId + '/members/search'
        + '?q=' + encodeURIComponent(communityMembersSearch)
        + '&page=' + communityMembersPage
        + '&limit=' + communityMembersLimit;
    } else {
      url = c.API_URL + '/api/v1/community/' + c.communityId + '/members'
        + '?page=' + communityMembersPage
        + '&limit=' + communityMembersLimit;
    }
    if (c.departmentId) {
      url += '&exclude_dept_id=' + encodeURIComponent(c.departmentId);
    }

    $.ajax({
      url: url,
      method: 'GET',
      success: function (res) {
        if (requestId !== communityMembersRequestId) return; // drop stale
        communityMembersLoading = false;
        var members = res.members || res.data || [];
        if (res.pagination && typeof res.pagination.totalCount === 'number') {
          communityMembersTotal = res.pagination.totalCount;
        } else if (typeof res.totalUsers === 'number') {
          communityMembersTotal = res.totalUsers;
        } else if (typeof res.totalCount === 'number') {
          communityMembersTotal = res.totalCount;
        }

        if (communityMembersPage === 1) {
          allCommunityMembers = members;
        } else {
          allCommunityMembers = allCommunityMembers.concat(members);
        }
        communityMembersHasMore = allCommunityMembers.length < communityMembersTotal;
        renderAddMembersList(allCommunityMembers);
      },
      error: function () {
        if (requestId !== communityMembersRequestId) return;
        communityMembersLoading = false;
        if (communityMembersPage === 1) {
          $('#dds-add-list').html('<div class="dds-add-empty">Failed to load members</div>');
        } else {
          // Step the page back so a future scroll will retry the same page.
          communityMembersPage = Math.max(1, communityMembersPage - 1);
        }
      }
    });
  }

  function renderAddMembersList(members) {
    var $list = $('#dds-add-list');

    if (!members.length) {
      var emptyMsg = communityMembersSearch
        ? 'No members match "' + esc(communityMembersSearch) + '"'
        : 'No available members to add';
      $list.html('<div class="dds-add-empty">' + emptyMsg + '</div>');
      return;
    }

    var html = '';
    members.forEach(function (m) {
      var user = m.user || {};
      var uid = user.userID || m.id || m._id || '';
      if (uid && typeof uid === 'object' && uid.$oid) uid = uid.$oid;
      var name = user.username || m.username || 'Unknown';
      var checked = selectedMemberIds.indexOf(uid) !== -1;

      html += '<div class="dds-add-item" data-uid="' + esc(uid) + '">' +
        '<div class="dds-add-check' + (checked ? ' checked' : '') + '"><i class="fa fa-check"></i></div>' +
        '<span class="dds-add-item-name">' + esc(name) + '</span>' +
      '</div>';
    });

    if (communityMembersHasMore) {
      html += '<div class="dds-add-loading" id="dds-add-more-loader"><i class="fa fa-spinner fa-spin"></i> Loading more...</div>';
    }

    $list.html(html);

    $list.find('.dds-add-item').on('click', function () {
      var uid = $(this).data('uid');
      var $check = $(this).find('.dds-add-check');
      var idx = selectedMemberIds.indexOf(uid);
      if (idx !== -1) {
        selectedMemberIds.splice(idx, 1);
        $check.removeClass('checked');
      } else {
        selectedMemberIds.push(uid);
        $check.addClass('checked');
      }
      updateAddButton();
    });
  }

  function updateAddButton() {
    var $btn = $('#dds-add-confirm');
    var count = selectedMemberIds.length;
    $btn.prop('disabled', count === 0);
    $btn.html('<i class="fa fa-plus"></i> Add (' + count + ')');
  }

  function addSelectedMembers() {
    if (!selectedMemberIds.length) return;
    var c = cfg();
    var $btn = $('#dds-add-confirm');
    $btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Adding...');

    $.ajax({
      url: c.API_URL + '/api/v1/community/' + c.communityId + '/departments/' + c.departmentId + '/members',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ members: selectedMemberIds }),
      success: function () {
        toast(selectedMemberIds.length + ' member' + (selectedMemberIds.length > 1 ? 's' : '') + ' added', 'success');
        closeAddMembersModal();
        membersPage = 1;
        membersData = [];
        loadMembers();
      },
      error: function () {
        toast('Failed to add members', 'error');
        $btn.prop('disabled', false).html('<i class="fa fa-plus"></i> Add (' + selectedMemberIds.length + ')');
      }
    });
  }

  /* ═══════════════════════════════════════════
     TAB 4: Options (Danger Zone)
     ═══════════════════════════════════════════ */

  function renderDangerTab($body) {
    var perms = getUserPermissions();
    var dept = getDept();
    var isPrivate = dept.approvalRequired === true;
    var canDelete = perms.isHeadAdmin || perms.manageDepartments;
    var canLeave = !perms.isOwner && !perms.isHeadAdmin;

    var html = '';

    if (canLeave) {
      html += isPrivate
        ? '<div class="dds-warn"><i class="fa fa-exclamation-triangle"></i><span>This is a <strong>private</strong> department. If you leave, you will need to be approved again to rejoin.</span></div>'
        : '<div class="dds-info"><i class="fa fa-info-circle"></i><span>This is a <strong>public</strong> department. You can rejoin anytime.</span></div>';
    }

    html += '<div class="dds-danger-zone">';
    html += '<div class="dds-danger-title"><i class="fa fa-exclamation-triangle" style="margin-right:0.35rem;"></i>Danger Zone</div>';

    if (canLeave) {
      html += '<div class="dds-danger-item">' +
        '<div class="dds-danger-item-info">' +
          '<div class="dds-danger-item-label">Leave Department</div>' +
          '<div class="dds-danger-item-desc">Remove yourself from this department</div>' +
        '</div>' +
        '<button class="dds-btn dds-btn-danger" id="dds-leave-dept"><i class="fa fa-right-from-bracket"></i> Leave</button>' +
      '</div>';
    } else {
      html += '<div class="dds-danger-item">' +
        '<div class="dds-danger-item-info">' +
          '<div class="dds-danger-item-label" style="color:var(--dd-text-muted);">Leave Department</div>' +
          '<div class="dds-danger-item-desc">Community owners and head admins cannot leave departments</div>' +
        '</div></div>';
    }

    if (canDelete) {
      html += '<div class="dds-danger-item">' +
        '<div class="dds-danger-item-info">' +
          '<div class="dds-danger-item-label">Delete Department</div>' +
          '<div class="dds-danger-item-desc">Permanently remove this department and all its data</div>' +
        '</div>' +
        '<button class="dds-btn dds-btn-danger" id="dds-delete-dept"><i class="fa fa-trash"></i> Delete</button>' +
      '</div>';
    }

    html += '</div>';
    $body.html(html);

    $body.find('#dds-leave-dept').on('click', function () { confirmLeave(isPrivate); });
    $body.find('#dds-delete-dept').on('click', function () { confirmDelete(); });
  }

  function confirmLeave(isPrivate) {
    if (!window.ddModal) {
      if (!confirm('Are you sure you want to leave this department?')) return;
      leaveDepartment();
      return;
    }

    window.ddModal({
      title: 'Leave Department',
      message: 'Are you sure you want to leave this department?',
      detail: isPrivate
        ? 'You will need to request access and be approved again to rejoin this private department.'
        : 'You can rejoin this public department at any time.',
      type: 'warning',
      icon: 'fa-right-from-bracket',
      confirmText: 'Leave',
      cancelText: 'Cancel',
      onConfirm: function () { leaveDepartment(); }
    });
  }

  function leaveDepartment() {
    var c = cfg();
    toast('Leaving department...', 'info');

    $.ajax({
      url: c.API_URL + '/api/v1/community/' + c.communityId + '/departments/' + c.departmentId + '/remove-user',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ userId: c.userId }),
      success: function () {
        toast('You have left the department', 'success');
        setTimeout(function () {
          var encoded = btoa(c.communityId).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
          window.location.href = '/community/' + encoded;
        }, 800);
      },
      error: function () { toast('Failed to leave department', 'error'); }
    });
  }

  function confirmDelete() {
    if (!window.ddModal) {
      if (!confirm('Are you sure you want to DELETE this department? This cannot be undone.')) return;
      deleteDepartment();
      return;
    }

    window.ddModal({
      title: 'Delete Department',
      message: 'Are you sure you want to <strong>permanently delete</strong> this department?',
      detail: 'This action cannot be undone. All department data, members, and settings will be permanently removed.',
      type: 'danger',
      icon: 'fa-trash',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: function () { deleteDepartment(); }
    });
  }

  function deleteDepartment() {
    var c = cfg();
    toast('Deleting department...', 'info');

    $.ajax({
      url: c.API_URL + '/api/v1/community/' + c.communityId + '/departments/' + c.departmentId,
      method: 'DELETE',
      success: function () {
        toast('Department deleted', 'success');
        setTimeout(function () {
          var encoded = btoa(c.communityId).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
          window.location.href = '/community/' + encoded;
        }, 800);
      },
      error: function () { toast('Failed to delete department', 'error'); }
    });
  }

  /* ─── Public API ─────────────────────────── */

  window.ddSettingsRender = renderComponent;
  window.ddSettingsInit = initComponent;

  // Convenience: clicking the sidebar settings link navigates to the component
  window.ddOpenSettings = function () {
    if (window.ddNavTo) window.ddNavTo('departmentSettings');
  };

})();
