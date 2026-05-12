/**
 * Department Dashboard — Civilians Component
 *
 * Registers window.ddCivRender and window.ddCivInit for the department
 * dashboard component registry. Provides civilian listing, search,
 * creation, editing, and detail viewing with vehicles/firearms/records tabs.
 */
(function () {
  'use strict';

  /* ───────────────────────────────────────────
     Helpers & Config
     ─────────────────────────────────────────── */

  var cfg = function () { return window.ddConfig || {}; };
  var esc = function (s) { return window.esc ? window.esc(s) : String(s || '').replace(/[&<>"']/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); };
  var toast = function (m, t) { if (window.ddToast) window.ddToast(m, t); };
  var fmtDate = function (d) { return window.formatDate ? window.formatDate(d) : d || 'N/A'; };

  // Detect the API's "record_deletion_restricted" 403 response so we can show
  // the friendly explanation instead of a generic "Failed to delete" toast.
  // Mirrors the helper in name-database.js, inlined here because that file
  // isn't loaded on the department dashboard.
  function isRecordDeletionRestrictedError(xhr) {
    if (!xhr || xhr.status !== 403) return false;
    var body = xhr.responseJSON;
    if (!body && typeof xhr.responseText === 'string') {
      try { body = JSON.parse(xhr.responseText); } catch (e) { body = null; }
    }
    if (!body) return false;
    return body.error === 'record_deletion_restricted'
        || body.code === 'record_deletion_restricted'
        || body.errorCode === 'record_deletion_restricted';
  }
  function showRecordDeletionRestrictedModal() {
    if (window.ddModal) {
      window.ddModal({
        type: 'warning',
        icon: 'fa-lock',
        title: 'Record deletion is restricted',
        message: "This department doesn't allow civilians to delete their own citations, written warnings, or arrest reports.",
        detail: "Contact a community admin or a user with the 'manage records' role permission to remove this record.",
        buttons: [{ label: 'Got it', class: 'dd-modal-btn-primary' }],
      });
    } else {
      toast('Record deletion is restricted for this department', 'warning');
    }
  }

  // Per-record civilian record-deletion gate. Mirrors window.canDeleteCivilianRecords
  // in name-database.js — re-defined here because that script isn't loaded on
  // the department dashboard. Reads window.communityDepartmentsCached and the
  // user's roles populated by cacheRecordDeletionContext().
  function canDeleteRecord(record) {
    var deptId = record && (record.departmentId || record.departmentID);
    var deptList = window.communityDepartmentsCached || [];
    var restricted = false;
    if (deptId) {
      for (var i = 0; i < deptList.length; i++) {
        var d = deptList[i];
        if (!d) continue;
        var dId = d._id || d.id;
        if (dId === deptId) {
          restricted = d.restrictCivilianRecordDeletion === true;
          break;
        }
      }
    }
    if (!restricted) return true;

    var user = window.dbUser || (cfg().dbUser);
    var uid = user && user._id;
    if (!uid) return false;

    if (window.communityOwnerIDCached && window.communityOwnerIDCached === uid) return true;

    var roles = window.communityRolesCached || [];
    for (var r = 0; r < roles.length; r++) {
      var role = roles[r];
      if (!role || !role.members || role.members.indexOf(uid) === -1) continue;
      var perms = role.permissions || [];
      for (var p = 0; p < perms.length; p++) {
        var perm = perms[p];
        if (perm && perm.enabled === true && (perm.name === 'administrator' || perm.name === 'manage records')) {
          return true;
        }
      }
    }
    return false;
  }

  // Convert any date value (string, timestamp, ISO) to YYYY-MM-DD for <input type="date">
  function toDateInputVal(val) {
    if (!val) return '';
    // If already YYYY-MM-DD, use as-is
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    // Try to parse (handles ISO strings, timestamps, locale strings)
    var d = new Date(val);
    if (!isNaN(d.getTime()) && d.getFullYear() > 1970) {
      return d.toISOString().substring(0, 10);
    }
    // Last resort: try substring for ISO-like strings
    if (typeof val === 'string' && val.length >= 10) return val.substring(0, 10);
    return '';
  }



  var PAGE_SIZE = window.innerWidth <= 600 ? 6 : 12;
  var SEARCH_LIMIT = 8;
  var ddCivPage = 0;
  var ddCivTotal = 0;
  var ddCivData = [];
  var ddCivSearchTerm = '';
  var ddCivSearchTimer = null;
  var approvalSystemEnabled = false; // fetched from community data

  /** Flatten API response item: { _id, civilian: {...} } -> { _id, ...civilian } */
  function flatten(item) {
    if (!item) return null;
    var civ = item.civilian || item.details || {};
    var out = $.extend({}, civ);
    out._id = item._id || item.id || civ._id || '';
    // Normalise _id to string
    if (out._id && typeof out._id === 'object' && out._id.$oid) {
      out._id = out._id.$oid;
    }
    return out;
  }

  /** Parse API response array, handling different envelope shapes */
  function parseList(data) {
    var arr = data.civilians || data.data || data || [];
    if (!Array.isArray(arr)) arr = [];
    return arr.map(flatten).filter(Boolean);
  }

  /** Compute age from birthday string */
  function calcAge(birthday) {
    if (!birthday) return '';
    var d = new Date(birthday);
    if (isNaN(d)) return '';
    var now = new Date();
    var age = now.getFullYear() - d.getFullYear();
    var m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age > 0 ? age : '';
  }

  /** Build initials from a name string */
  function initials(name) {
    if (!name) return '?';
    var parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  }

  /** Approval status label and colour */
  function approvalBadge(status) {
    var map = {
      approved:          { label: 'Approved',   cls: 'dd-civ-badge-approved' },
      denied:            { label: 'Denied',     cls: 'dd-civ-badge-denied' },
      requested_review:  { label: 'Pending',    cls: 'dd-civ-badge-pending' },
      pending:           { label: 'Pending',    cls: 'dd-civ-badge-pending' },
      require_edits:     { label: 'Needs Edits', cls: 'dd-civ-badge-edits' }
    };
    return map[status] || { label: status || 'Unknown', cls: 'dd-civ-badge-default' };
  }

  /* ───────────────────────────────────────────
     Inline Styles (<style> injected once)
     ─────────────────────────────────────────── */

  var stylesInjected = false;

  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;

    var css = '' +
      /* ── Toolbar ── */
      '.dd-civ-toolbar{display:flex;align-items:center;gap:0.625rem;flex-wrap:wrap;}' +
      '.dd-civ-search-wrap{position:relative;flex:1;min-width:160px;}' +
      '.dd-civ-search-wrap i{position:absolute;left:0.625rem;top:50%;transform:translateY(-50%);color:var(--dd-text-dim);font-size:0.75rem;pointer-events:none;}' +
      '.dd-civ-search{background:var(--dd-glass);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius-sm);padding:0.5rem 0.75rem;color:var(--dd-text);font-family:inherit;font-size:0.8125rem;outline:none;transition:border-color 0.2s;}' +
      '.dd-civ-search:focus{border-color:rgba(255,255,255,0.15);}' +
      '.dd-civ-search::placeholder{color:var(--dd-text-dim);}' +
      '.dd-civ-search-wrap .dd-civ-search{width:100%;padding-left:2rem;}' +

      /* ── Add button (outline style) ── */
      '.dd-civ-add-btn{padding:0.5rem 0.875rem;border-radius:var(--dd-radius-sm);border:1px solid rgba(59,130,246,0.25);background:rgba(59,130,246,0.1);color:#93c5fd;font-family:inherit;font-size:0.75rem;font-weight:500;cursor:pointer;transition:all 0.2s;white-space:nowrap;display:inline-flex;align-items:center;gap:0.375rem;}' +
      '.dd-civ-add-btn:hover{background:rgba(59,130,246,0.18);border-color:rgba(59,130,246,0.4);color:#bfdbfe;}' +

      /* ── Medical sub-tab toggles ── */
      '.dd-med-subtab{padding:0.5rem 1rem;border-radius:var(--dd-radius-sm);border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:var(--dd-text-muted);font-family:inherit;font-size:0.8rem;font-weight:600;cursor:pointer;transition:all 0.2s;display:inline-flex;align-items:center;gap:0.35rem;}' +
      '.dd-med-subtab:hover{background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.15);}' +
      '.dd-med-subtab-active{background:rgba(124,58,237,0.15) !important;border-color:rgba(124,58,237,0.4) !important;color:#c4b5fd !important;}' +
      '.dd-med-subtab-badge{background:rgba(255,255,255,0.1);color:var(--dd-text-muted);font-size:0.7rem;font-weight:600;padding:0.1rem 0.45rem;border-radius:999px;margin-left:0.2rem;}' +
      '.dd-med-subtab-active .dd-med-subtab-badge{background:rgba(124,58,237,0.3);color:#c4b5fd;}' +

      /* ── Modal/action buttons ── */
      '.dd-civ-btn{padding:0.5rem 1rem;border:none;border-radius:var(--dd-radius);font-size:0.8125rem;font-weight:600;cursor:pointer;transition:all 0.2s;font-family:inherit;}' +
      '.dd-civ-btn-primary{background:var(--dd-accent);color:#fff;}' +
      '.dd-civ-btn-primary:hover{filter:brightness(1.15);transform:translateY(-1px);}' +
      '.dd-civ-btn-secondary{background:var(--dd-glass);color:var(--dd-text);border:1px solid var(--dd-glass-border);}' +
      '.dd-civ-btn-secondary:hover{background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.12);}' +
      '.dd-civ-btn-danger{background:var(--dd-red);color:#fff;}' +
      '.dd-civ-btn-danger:hover{filter:brightness(1.15);}' +
      '.dd-civ-btn-small{padding:0.35rem 0.65rem;font-size:0.75rem;}' +

      /* ── Grid ── */
      '.dd-civ-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:0.75rem;}' +

      /* ── Card ── */
      '.dd-civ-card{background:var(--dd-glass);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius);padding:1rem;cursor:pointer;transition:all 0.2s;display:flex;align-items:flex-start;gap:0.75rem;}' +
      '.dd-civ-card:hover{background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.12);transform:translateY(-2px);}' +
      '.dd-civ-avatar{width:44px;height:44px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:0.8125rem;font-weight:700;color:#fff;background:var(--dd-blue);overflow:hidden;}' +
      '.dd-civ-avatar img{width:100%;height:100%;object-fit:cover;}' +
      '.dd-civ-info{flex:1;min-width:0;}' +
      '.dd-civ-name{font-size:0.875rem;font-weight:600;color:var(--dd-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.dd-civ-meta{font-size:0.75rem;color:var(--dd-text-muted);margin-top:0.15rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.dd-civ-badge{display:inline-block;font-size:0.625rem;font-weight:600;padding:0.15rem 0.5rem;border-radius:999px;text-transform:uppercase;letter-spacing:0.04em;margin-top:0.35rem;}' +
      '.dd-civ-badge-approved{background:rgba(34,197,94,0.15);color:var(--dd-green);}' +
      '.dd-civ-badge-denied{background:rgba(239,68,68,0.15);color:var(--dd-red);}' +
      '.dd-civ-badge-pending{background:rgba(245,158,11,0.15);color:var(--dd-amber);}' +
      '.dd-civ-badge-edits{background:rgba(245,158,11,0.15);color:var(--dd-amber);}' +
      '.dd-civ-badge-default{background:rgba(100,116,139,0.15);color:var(--dd-text-muted);}' +
      '.dd-civ-card-chips{display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;margin-top:0.35rem;}' +
      '.dd-civ-card-chips .dd-civ-badge{margin-top:0;}' +
      '.dd-civ-balance-chip{display:inline-flex;align-items:center;font-size:0.7rem;font-weight:600;padding:0.15rem 0.5rem;border-radius:999px;background:rgba(56,189,248,0.12);color:#38bdf8;border:1px solid rgba(56,189,248,0.25);font-variant-numeric:tabular-nums;letter-spacing:0.01em;}' +
      '.dd-civ-balance-chip.dd-civ-balance-neg{background:rgba(239,68,68,0.12);color:var(--dd-red);border-color:rgba(239,68,68,0.25);}' +

      /* ── Inbox button on civ cards ── */
      '.dd-civ-inbox-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,0.04);border:1px solid var(--dd-glass-border);color:var(--dd-text-muted);cursor:pointer;font-size:0.78rem;flex-shrink:0;align-self:flex-start;transition:all 0.15s;}' +
      '.dd-civ-inbox-btn:hover{background:rgba(56,189,248,0.12);border-color:rgba(56,189,248,0.3);color:#38bdf8;}' +
      '.dd-civ-inbox-btn.has-pending{background:rgba(245,158,11,0.14);border-color:rgba(245,158,11,0.35);color:#fbbf24;}' +
      '.dd-civ-inbox-btn.has-pending:hover{background:rgba(245,158,11,0.22);}' +
      '.dd-civ-inbox-count{position:absolute;top:-5px;right:-5px;background:#f59e0b;color:#0a0a0f;font-size:0.6rem;font-weight:700;min-width:16px;height:16px;padding:0 4px;border-radius:8px;display:flex;align-items:center;justify-content:center;border:1.5px solid var(--dd-bg,#08090c);font-variant-numeric:tabular-nums;}' +

      /* ── Pagination ── */
      '.dd-civ-pagination{display:flex;align-items:center;justify-content:center;gap:0.75rem;margin-top:1rem;}' +
      '.dd-civ-page-info{font-size:0.75rem;color:var(--dd-text-muted);}' +
      '.dd-civ-page-btn{background:var(--dd-glass);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius);color:var(--dd-text);padding:0.35rem 0.75rem;font-size:0.75rem;cursor:pointer;transition:all 0.2s;font-family:inherit;}' +
      '.dd-civ-page-btn:hover:not(:disabled){background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.12);}' +
      '.dd-civ-page-btn:disabled{opacity:0.35;cursor:default;}' +

      /* ── Detail Modal Overlay ── */
      '.dd-civ-overlay{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity 0.25s;overflow-y:auto;overscroll-behavior:contain;height:100vh;height:100dvh;}' +
      '.dd-civ-overlay.dd-civ-visible{opacity:1;pointer-events:auto;}' +

      /* ── Detail Panel ── */
      '.dd-civ-detail{background:var(--dd-surface,#13131a);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius);width:94vw;max-width:720px;height:88vh;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.5);}' +
      '.dd-civ-detail-header{display:flex;align-items:center;gap:0.75rem;padding:1rem 1.25rem;border-bottom:1px solid var(--dd-glass-border);}' +
      '.dd-civ-detail-avatar{width:52px;height:52px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:700;color:#fff;background:var(--dd-blue);overflow:hidden;}' +
      '.dd-civ-detail-avatar img{width:100%;height:100%;object-fit:cover;}' +
      '.dd-civ-detail-title{flex:1;min-width:0;}' +
      '.dd-civ-detail-name{font-size:1.125rem;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.dd-civ-detail-sub{font-size:0.75rem;color:var(--dd-text-muted);margin-top:0.15rem;}' +
      '.dd-civ-close{background:none;border:none;color:var(--dd-text-muted);font-size:1.25rem;cursor:pointer;padding:0.25rem;transition:color 0.2s;}' +
      '.dd-civ-close:hover{color:var(--dd-text);}' +

      /* ── Tabs ── */
      '.dd-civ-tabs{display:flex;border-bottom:1px solid var(--dd-glass-border);overflow-x:auto;flex-shrink:0;}' +
      '.dd-civ-tab{padding:0.625rem 1rem;font-size:0.8125rem;font-weight:500;color:var(--dd-text-muted);cursor:pointer;border-bottom:2px solid transparent;transition:all 0.2s;white-space:nowrap;background:none;border-top:none;border-left:none;border-right:none;font-family:inherit;}' +
      '.dd-civ-tab:hover{color:var(--dd-text);}' +
      '.dd-civ-tab.dd-civ-tab-active{color:var(--dd-accent);border-bottom-color:var(--dd-accent);}' +
      '.dd-civ-tab-body{flex:1;overflow-y:auto;padding:1.25rem;}' +

      /* ── Detail Actions ── */
      '.dd-civ-detail-actions{display:flex;gap:0.5rem;padding:0.75rem 1.25rem;border-top:1px solid var(--dd-glass-border);flex-wrap:wrap;padding-bottom:calc(0.75rem + env(safe-area-inset-bottom, 0px));}' +

      /* ── Form styles ── */
      '.dd-civ-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;}' +
      '.dd-civ-form-full{grid-column:1/-1;}' +
      '.dd-civ-field{display:flex;flex-direction:column;gap:0.25rem;}' +
      '.dd-civ-field label{font-size:0.75rem;font-weight:500;color:var(--dd-text-muted);}' +
      '.dd-civ-field input,.dd-civ-field select,.dd-civ-field textarea{padding:0.5rem 0.65rem;background:var(--dd-glass);border:1px solid var(--dd-glass-border);border-radius:8px;color:var(--dd-text);font-size:0.8125rem;outline:none;font-family:inherit;transition:border-color 0.2s;}' +
      '.dd-civ-field input:focus,.dd-civ-field select:focus,.dd-civ-field textarea:focus{border-color:var(--dd-accent);}' +
      '.dd-civ-field select{appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'6\'%3E%3Cpath d=\'M0 0l5 6 5-6z\' fill=\'%2364748b\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 0.65rem center;}' +
      '.dd-civ-field select option{background:#1a1a24;color:var(--dd-text);}' +
      '.dd-civ-checkbox-row{display:flex;flex-wrap:wrap;gap:0.75rem 1.25rem;grid-column:1/-1;margin-top:0.25rem;}' +
      '.dd-civ-checkbox{display:flex;align-items:center;gap:0.35rem;font-size:0.8125rem;color:var(--dd-text);cursor:pointer;}' +
      '.dd-civ-checkbox input{accent-color:var(--dd-accent);cursor:pointer;}' +

      /* ── Record cards ── */
      '.dd-civ-record{background:var(--dd-glass);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius);padding:0.75rem 1rem;margin-bottom:0.5rem;}' +
      '.dd-civ-record-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:0.35rem;}' +
      '.dd-civ-record-type{font-size:0.8125rem;font-weight:600;color:var(--dd-text);}' +
      '.dd-civ-record-date{font-size:0.6875rem;color:var(--dd-text-muted);}' +
      '.dd-civ-record-notes{font-size:0.75rem;color:var(--dd-text-muted);margin-top:0.25rem;}' +
      '.dd-civ-record-fines{display:flex;flex-wrap:wrap;gap:0.35rem;margin-top:0.35rem;}' +
      '.dd-civ-fine-tag{font-size:0.6875rem;padding:0.15rem 0.45rem;border-radius:4px;background:rgba(239,68,68,0.12);color:var(--dd-red);}' +
      '.dd-civ-record-status{font-size:0.625rem;font-weight:600;padding:0.1rem 0.4rem;border-radius:4px;margin-left:0.4rem;}' +
      '.dd-civ-record-dismissed{background:rgba(100,116,139,0.15);color:var(--dd-text-muted);text-decoration:line-through;}' +
      '.dd-civ-record-contested{background:rgba(245,158,11,0.15);color:var(--dd-amber);}' +
      '.dd-civ-record-upheld{background:rgba(239,68,68,0.15);color:var(--dd-red);}' +
      /* ── Record filter bar ── */
      '.dd-rec-filters{display:flex;gap:0.25rem;margin-bottom:0.75rem;background:var(--dd-glass);border:1.5px solid var(--dd-glass-border);border-radius:8px;padding:0.2rem;}' +
      '.dd-rec-filter-btn{background:transparent;color:var(--dd-text-muted);border:none;border-radius:6px;padding:0.4rem 0.75rem;font-size:0.75rem;font-weight:500;cursor:pointer;transition:all 0.2s;flex:1;text-align:center;}' +
      '.dd-rec-filter-btn.active{background:var(--dd-accent);color:#fff;}' +
      /* ── Contest system ── */
      '.dd-rec-contest-area{display:flex;align-items:center;gap:0.4rem;margin-top:0.35rem;}' +
      '.dd-rec-contest-cb{width:14px;height:14px;accent-color:var(--dd-amber);cursor:pointer;}' +
      '.dd-rec-contest-label{font-size:0.6875rem;color:var(--dd-amber);cursor:pointer;user-select:none;}' +
      '.dd-civ-record.dd-rec-selected{border-color:var(--dd-amber);background:rgba(245,158,11,0.06);}' +
      '.dd-rec-contest-hint{font-size:0.75rem;color:var(--dd-text-muted);padding:0.5rem 0.75rem;background:var(--dd-glass);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius-sm);margin-bottom:0.5rem;display:flex;align-items:flex-start;gap:0.4rem;line-height:1.5;word-break:break-word;}' +
      '.dd-rec-contest-hint i{flex-shrink:0;margin-top:0.2rem;}' +
      '.dd-rec-contest-btn{background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;padding:0.5rem 1rem;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.8125rem;display:none;align-items:center;gap:0.4rem;margin-bottom:0.75rem;}' +
      '.dd-rec-contest-btn.visible{display:inline-flex;}' +

      /* ── Vehicle / Firearm sub-cards ── */
      '.dd-civ-sub-card{background:var(--dd-glass);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius);padding:0.75rem 1rem;display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;}' +
      '.dd-civ-sub-card-info{flex:1;min-width:0;}' +
      '.dd-civ-sub-card-title{font-size:0.8125rem;font-weight:600;color:var(--dd-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.dd-civ-sub-card-meta{font-size:0.6875rem;color:var(--dd-text-muted);margin-top:0.1rem;}' +

      /* ── Vehicle card enhancements ── */
      '.dd-veh-card{background:var(--dd-glass);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius);padding:0.55rem 0.85rem;display:flex;align-items:center;gap:0.7rem;margin-bottom:0.4rem;transition:border-color 0.15s;}' +
      '.dd-veh-card:hover{border-color:rgba(56,189,248,0.25);}' +
      '.dd-veh-card-icon{width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:0.8rem;}' +
      '.dd-veh-card-icon.veh-ok{background:rgba(34,197,94,0.12);color:#22c55e;}' +
      '.dd-veh-card-icon.veh-stolen{background:rgba(239,68,68,0.15);color:#ef4444;}' +
      '.dd-veh-card-body{flex:1;min-width:0;}' +
      '.dd-veh-card-row{display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;}' +
      '.dd-veh-card-plate{font-size:0.8125rem;font-weight:700;color:var(--dd-text);letter-spacing:0.03em;white-space:nowrap;}' +
      '.dd-veh-plate-state{font-size:0.5625rem;font-weight:500;color:var(--dd-text-muted);background:rgba(255,255,255,0.06);padding:0.05rem 0.3rem;border-radius:3px;white-space:nowrap;}' +
      '.dd-veh-sep{color:var(--dd-text-dim);font-size:0.55rem;opacity:0.35;}' +
      '.dd-veh-card-desc{font-size:0.75rem;color:var(--dd-text-muted);white-space:nowrap;}' +
      '.dd-veh-card-detail{font-size:0.6875rem;color:var(--dd-text-dim);display:inline-flex;align-items:center;gap:0.2rem;white-space:nowrap;}' +
      '.dd-veh-card-detail i{font-size:0.55rem;opacity:0.6;}' +
      '.dd-veh-badges{display:flex;flex-wrap:wrap;gap:0.25rem;margin-top:0.25rem;}' +
      '.dd-veh-badge{font-size:0.5625rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;padding:0.1rem 0.35rem;border-radius:4px;display:inline-flex;align-items:center;gap:0.2rem;line-height:1.3;}' +
      '.dd-veh-badge i{font-size:0.5rem;}' +
      '.dd-veh-badge.badge-stolen{background:rgba(239,68,68,0.15);color:#f87171;border:1px solid rgba(239,68,68,0.25);}' +
      '.dd-veh-badge.badge-exempt{background:rgba(245,158,11,0.12);color:#fbbf24;border:1px solid rgba(245,158,11,0.2);}' +
      '.dd-veh-badge.badge-reg{background:rgba(251,146,60,0.12);color:#fb923c;border:1px solid rgba(251,146,60,0.2);}' +
      '.dd-veh-badge.badge-ins{background:rgba(168,85,247,0.12);color:#c084fc;border:1px solid rgba(168,85,247,0.2);}' +
      '.dd-veh-card-action{flex-shrink:0;align-self:center;}' +

      /* ── Link search (top bar) ── */
      '.dd-civ-link-bar{display:flex;align-items:center;justify-content:space-between;gap:0.75rem;margin-bottom:0.75rem;position:relative;z-index:200;}' +
      '.dd-civ-link-bar-label{font-size:0.75rem;font-weight:600;color:var(--dd-text-muted);white-space:nowrap;}' +
      '.dd-civ-link-search-wrap{position:relative;width:260px;flex-shrink:0;}' +
      '.dd-civ-link-search-wrap .dd-civ-search{width:100%;padding-right:2rem;font-size:0.75rem;padding:0.4rem 0.65rem;}' +
      '.dd-civ-link-search-wrap .dd-link-search-icon{position:absolute;right:0.6rem;top:50%;transform:translateY(-50%);color:var(--dd-text-dim);font-size:0.7rem;pointer-events:none;}' +
      '.dd-civ-link-results{position:absolute;top:100%;right:0;width:340px;z-index:9999;margin-top:0.25rem;background:#111118;border:1px solid rgba(255,255,255,0.12);border-radius:var(--dd-radius-sm);box-shadow:0 12px 40px rgba(0,0,0,0.7),0 0 0 1px rgba(0,0,0,0.3);max-height:320px;overflow-y:auto;}' +
      '.dd-civ-link-results:empty{display:none;}' +
      '.dd-civ-link-results .dd-veh-card{margin:0;border-radius:0;border:none;border-bottom:1px solid rgba(255,255,255,0.07);cursor:pointer;padding:0.6rem 0.85rem;background:transparent;}' +
      '.dd-civ-link-results .dd-veh-card:last-child{border-bottom:0;}' +
      '.dd-civ-link-results .dd-veh-card:hover{background:rgba(56,189,248,0.06);}' +
      '.dd-civ-link-results .dd-veh-card-body{display:flex;flex-direction:column;gap:0.15rem;}' +
      '.dd-civ-link-results .dd-veh-card-row{flex-direction:column;align-items:flex-start;gap:0.15rem;}' +
      '.dd-civ-link-results .dd-veh-card-row .dd-veh-sep:first-of-type{display:none;}' +
      '.dd-civ-link-results .dd-veh-card-plate{font-size:0.85rem;}' +
      '.dd-civ-link-results .dd-veh-meta-line{display:flex;align-items:center;gap:0.35rem;flex-wrap:wrap;}' +
      '.dd-civ-link-section{margin-top:1rem;padding-top:0.75rem;border-top:1px solid var(--dd-glass-border);}' +
      '.dd-civ-link-title{font-size:0.75rem;font-weight:600;color:var(--dd-text-muted);margin-bottom:0.5rem;}' +

      /* ── New Civilian Modal ── */
      '.dd-civ-new-overlay{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity 0.25s;overflow-y:auto;overscroll-behavior:contain;}' +
      '.dd-civ-new-overlay.dd-civ-visible{opacity:1;pointer-events:auto;}' +
      '.dd-civ-new-panel{background:var(--dd-surface,#13131a);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius);width:94vw;max-width:560px;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.5);}' +
      '.dd-civ-new-header{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;border-bottom:1px solid var(--dd-glass-border);}' +
      '.dd-civ-new-title{font-size:1rem;font-weight:700;color:#fff;}' +
      '.dd-civ-new-body{flex:1;overflow-y:auto;padding:1.25rem;}' +
      '.dd-civ-new-footer{display:flex;justify-content:flex-end;gap:0.5rem;padding:0.75rem 1.25rem;border-top:1px solid var(--dd-glass-border);padding-bottom:calc(0.75rem + env(safe-area-inset-bottom, 0px));}' +

      /* ── Placeholder tab ── */
      '.dd-civ-placeholder{text-align:center;padding:2rem 1rem;color:var(--dd-text-muted);}' +
      '.dd-civ-placeholder i{font-size:1.5rem;margin-bottom:0.5rem;display:block;opacity:0.4;}' +

      /* ── Approval card borders ── */
      '.dd-civ-card.dd-civ-status-approved{border-color:rgba(34,197,94,0.35);}' +
      '.dd-civ-card.dd-civ-status-requested_review{border-color:rgba(59,130,246,0.35);}' +
      '.dd-civ-card.dd-civ-status-pending{border-color:rgba(245,158,11,0.35);}' +
      '.dd-civ-card.dd-civ-status-denied{border-color:rgba(239,68,68,0.35);}' +
      '.dd-civ-card.dd-civ-status-rejected{border-color:rgba(239,68,68,0.35);}' +
      '.dd-civ-card.dd-civ-status-require_edits{border-color:rgba(245,158,11,0.35);}' +
      '.dd-civ-card.dd-civ-status-requires_edits{border-color:rgba(245,158,11,0.35);}' +
      '.dd-civ-card.dd-civ-status-no_status{border-color:rgba(245,158,11,0.35);}' +

      /* ── Photo upload ── */
      '.dd-civ-photo-upload{position:relative;display:inline-block;cursor:pointer;}' +
      '.dd-civ-photo-upload input[type="file"]{display:none;}' +
      '.dd-civ-photo-overlay{position:absolute;inset:0;border-radius:50%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.2s;}' +
      '.dd-civ-photo-upload:hover .dd-civ-photo-overlay{opacity:1;}' +
      '.dd-civ-photo-overlay i{color:#fff;font-size:1.25rem;}' +

      /* ── Height/Weight toggle buttons ── */
      '.dd-civ-toggle-wrap{display:inline-flex;background:var(--dd-glass);border:1.5px solid var(--dd-glass-border);border-radius:8px;padding:0.2rem;margin-bottom:0.5rem;}' +
      '.dd-civ-toggle-btn{background:transparent;color:var(--dd-text-muted);border:none;border-radius:6px;padding:0.4rem 0.75rem;font-size:0.75rem;font-weight:500;cursor:pointer;transition:all 0.2s;}' +
      '.dd-civ-toggle-btn.active{background:var(--dd-accent);color:#fff;}' +
      /* ── Section divider ── */
      '.dd-civ-section-label{font-size:0.8125rem;color:var(--dd-text-muted);margin-top:0.75rem;margin-bottom:0.25rem;grid-column:1/-1;}' +

      /* ── Approval warning banner ── */
      '.dd-civ-approval-warning{background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);border-radius:var(--dd-radius-sm);padding:0.625rem 0.875rem;margin-bottom:0.75rem;font-size:0.75rem;color:var(--dd-amber);display:flex;align-items:center;gap:0.5rem;}' +
      '.dd-civ-approval-warning i{flex-shrink:0;}' +

      /* ── License / Medical cards ── */
      '.dd-civ-item-card{background:var(--dd-glass);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius);padding:0.75rem 1rem;margin-bottom:0.5rem;display:flex;align-items:flex-start;gap:0.75rem;}' +
      '.dd-civ-item-card-info{flex:1;min-width:0;}' +
      '.dd-civ-item-card-title{font-size:0.8125rem;font-weight:600;color:var(--dd-text);}' +
      '.dd-civ-item-card-meta{font-size:0.6875rem;color:var(--dd-text-muted);margin-top:0.15rem;}' +
      '.dd-civ-item-card-actions{display:flex;gap:0.35rem;flex-shrink:0;}' +
      '.dd-civ-inline-form{background:var(--dd-glass);border:1px solid var(--dd-glass-border);border-radius:var(--dd-radius);padding:1rem;margin-bottom:0.75rem;}' +
      '.dd-civ-inline-form-title{font-size:0.875rem;font-weight:600;color:var(--dd-text);margin-bottom:0.75rem;}' +

      /* ── Responsive ── */
      '@media(max-width:600px){' +
        '.dd-civ-form-grid{grid-template-columns:1fr;}' +
        '.dd-civ-toolbar{flex-direction:column;align-items:stretch;}' +
        '.dd-civ-search-wrap{min-width:0;}' +
        '.dd-civ-detail{width:100vw;max-width:100vw;height:100vh;height:100dvh;max-height:100vh;max-height:100dvh;border-radius:0;}' +
        '.dd-civ-new-panel{width:100vw;max-width:100vw;height:100vh;height:100dvh;max-height:100vh;max-height:100dvh;border-radius:0;}' +
        '.dd-rec-filters{flex-wrap:wrap;}' +
        '.dd-rec-filter-btn{flex:0 1 auto;padding:0.35rem 0.5rem;font-size:0.6875rem;}' +
        '.dd-rec-contest-hint{font-size:0.6875rem;padding:0.5rem 0.65rem;}' +
      '}' +
    '';

    $('<style>').text(css).appendTo('head');
  }

  /* ───────────────────────────────────────────
     Render Function (returns HTML string)
     ─────────────────────────────────────────── */

  window.ddCivRender = function (/* key */) {
    return '' +
      '<div class="dd-card-header">' +
        '<div class="dd-card-header-left">' +
          '<div class="dd-card-icon" style="background:rgba(59,130,246,0.15);color:var(--dd-blue);"><i class="fa fa-users"></i></div>' +
          '<div><h3 class="dd-card-title">Civilians</h3><p class="dd-card-subtitle">Manage civilian profiles</p></div>' +
        '</div>' +
      '</div>' +
      '<div class="dd-card-body">' +
        '<div class="dd-civ-toolbar" style="margin-bottom:0.875rem;">' +
          '<div class="dd-civ-search-wrap">' +
            '<i class="fa fa-search"></i>' +
            '<input type="text" class="dd-civ-search" id="dd-civ-search" placeholder="Search civilians..." autocomplete="off">' +
          '</div>' +
          '<button class="dd-civ-add-btn" id="dd-civ-add-btn"><i class="fa fa-plus"></i> Add New Civilian</button>' +
        '</div>' +
        '<div class="dd-civ-loading dd-spinner"></div>' +
        '<div class="dd-civ-empty-state dd-empty" style="display:none;">' +
          '<div class="dd-empty-icon-wrap" style="background:rgba(59,130,246,0.08);border-color:rgba(59,130,246,0.15);">' +
            '<i class="fa fa-users" style="color:var(--dd-blue);"></i>' +
          '</div>' +
          '<p class="dd-empty-title">No civilians found</p>' +
          '<p class="dd-empty-sub">Create your first civilian to get started</p>' +
        '</div>' +
        '<div id="dd-civ-grid" class="dd-civ-grid" style="display:none;"></div>' +
        '<div class="dd-civ-pagination" id="dd-civ-pagination" style="display:none;">' +
          '<button class="dd-civ-page-btn" id="dd-civ-prev"><i class="fa fa-chevron-left"></i> Prev</button>' +
          '<span class="dd-civ-page-info" id="dd-civ-page-info">Page 1</span>' +
          '<button class="dd-civ-page-btn" id="dd-civ-next">Next <i class="fa fa-chevron-right"></i></button>' +
        '</div>' +
      '</div>';
  };

  /* ───────────────────────────────────────────
     Init Function
     ─────────────────────────────────────────── */

  window.ddCivInit = function () {
    injectStyles();
    ddCivPage = 0;
    ddCivSearchTerm = '';
    wireEvents();
    if (window.ddLimits) window.ddLimits.check('civilian');

    // Check if community data is already available (fetched by main dashboard)
    var c = cfg();
    var existing = (c.communityData || {});
    if (existing.civilianApprovalSystemEnabled !== undefined) {
      approvalSystemEnabled = !!(existing.civilianApprovalSystemEnabled);
      cacheRecordDeletionContext(existing);
      loadCivilians();
      return;
    }

    // Otherwise fetch community data, then load civilians so badges render correctly
    if (c.communityId) {
      $.ajax({
        url: c.API_URL + '/api/v1/community/' + c.communityId,
        method: 'GET',
        success: function (data) {
          var comm = data.community || data || {};
          approvalSystemEnabled = !!(comm.civilianApprovalSystemEnabled);
          cacheRecordDeletionContext(comm);
        },
        error: function () { approvalSystemEnabled = false; },
        complete: function () { loadCivilians(); }
      });
    } else {
      loadCivilians();
    }
  };

  // Cache the per-department restrictCivilianRecordDeletion list plus owner +
  // roles so window.canDeleteCivilianRecords (name-database.js) can decide
  // per-record whether to show the delete button.
  function cacheRecordDeletionContext(comm) {
    if (!comm) return;
    window.communityDepartmentsCached = comm.departments || [];
    window.communityOwnerIDCached = comm.ownerID || '';
    window.communityRolesCached = comm.roles || [];
    // Economy: cache the master enable flag so the civilian grid can show
    // balance chips without an extra fetch.
    window.communityEconomyEnabled = !!(comm.economy && comm.economy.enabled);
  }

  // Base64url-encode a civilian id so links can use the standard ?c= param
  // that resolveEconomyContext expects (mirrors the server-side encodeId).
  function ddCivEncodeId(id) {
    try {
      return btoa(String(id)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch (e) { return id; }
  }

  // Inbox pending-counts plumbing. Decorates each card's <inbox> button with
  // the count of pending/delinquent/contested items for that civilian.
  var ddCivInboxCounts = {};
  var ddCivInboxWs = null;

  function ddCivApplyInboxCounts() {
    Object.keys(ddCivInboxCounts).forEach(function (civId) {
      var count = ddCivInboxCounts[civId] || 0;
      var $count = $('[data-civ-inbox-count="' + civId + '"]');
      var $dot = $('[data-civ-inbox-dot="' + civId + '"]');
      var $btn = $('[data-civ-inbox="' + civId + '"]');
      if (!$btn.length) return;
      if (count > 0) {
        $btn.addClass('has-pending');
        $count.text(count > 99 ? '99+' : count).show();
        $dot.hide();
      } else {
        $btn.removeClass('has-pending');
        $count.hide();
        $dot.hide();
      }
    });
  }

  function ddCivLoadInboxCounts() {
    var c = cfg();
    if (!window.communityEconomyEnabled || !c.userId || !c.communityId) return;
    $.ajax({
      url: c.API_URL + '/api/v2/economy/inbox/pending-counts',
      data: { userId: c.userId, communityId: c.communityId },
      method: 'GET',
      success: function (resp) {
        ddCivInboxCounts = (resp && resp.counts) || {};
        ddCivApplyInboxCounts();
      },
      error: function () { /* swallow — non-essential decoration */ }
    });
    ddCivEnsureInboxSocket();
  }

  function ddCivEnsureInboxSocket() {
    if (ddCivInboxWs && ddCivInboxWs.readyState <= 1) return;
    var c = cfg();
    if (!c.userId || !c.communityId || !c.API_URL) return;
    var proto = c.API_URL.indexOf('https') === 0 ? 'wss' : 'ws';
    var host = c.API_URL.replace(/^https?:\/\//, '');
    var url = proto + '://' + host + '/ws/notifications?userId=' + encodeURIComponent(c.userId)
            + '&communityId=' + encodeURIComponent(c.communityId);
    try {
      ddCivInboxWs = new WebSocket(url);
    } catch (e) { return; }
    ddCivInboxWs.onmessage = function (ev) {
      try {
        var msg = JSON.parse(ev.data);
        if (msg.event !== 'inbox.created' && msg.event !== 'inbox.updated') return;
        var item = msg.data || {};
        var civId = item.civilianId;
        if (!civId) return;
        // Recompute count for that civ — easier than diff math.
        ddCivLoadInboxCounts();
      } catch (e) { /* swallow */ }
    };
    ddCivInboxWs.onclose = function () {
      ddCivInboxWs = null;
      // Light reconnect after 5s; the dashboard stays mounted while the user works.
      setTimeout(ddCivEnsureInboxSocket, 5000);
    };
  }

  // Format a cents balance as a USD-style string. Inline since dd-civilians.js
  // doesn't pull a shared money helper.
  function ddCivFmtBalance(cents) {
    var c = typeof cents === 'number' ? cents : 0;
    var sign = c < 0 ? '-' : '';
    var abs = Math.abs(c);
    var dollars = Math.floor(abs / 100);
    var rem = abs % 100;
    return sign + '$' + dollars.toLocaleString() + '.' + (rem < 10 ? '0' : '') + rem;
  }

  /* ───────────────────────────────────────────
     Data Loading
     ─────────────────────────────────────────── */

  function loadCivilians() {
    var c = cfg();
    var $grid = $('#dd-civ-grid');
    var $loading = $('.dd-civ-loading');
    var $empty = $('.dd-civ-empty-state');
    var $pagination = $('#dd-civ-pagination');

    $grid.hide();
    $empty.hide();
    $pagination.hide();
    $loading.show();

    var url = c.API_URL + '/api/v2/civilians/user/' + c.userId +
      '?active_community_id=' + encodeURIComponent(c.communityId) +
      '&limit=' + PAGE_SIZE +
      '&page=' + ddCivPage;

    $.ajax({
      url: url,
      method: 'GET',
      headers: {},
      success: function (data) {
        $loading.hide();
        ddCivData = parseList(data);
        ddCivTotal = (data && data.totalCount != null) ? data.totalCount : (ddCivData.length < PAGE_SIZE ? (ddCivPage * PAGE_SIZE + ddCivData.length) : -1);
        renderGrid();
      },
      error: function () {
        $loading.hide();
        ddCivData = [];
        renderGrid();
        toast('Failed to load civilians', 'error');
      }
    });
  }

  function searchCivilians(term) {
    var c = cfg();
    var $grid = $('#dd-civ-grid');
    var $loading = $('.dd-civ-loading');
    var $empty = $('.dd-civ-empty-state');

    $grid.hide();
    $empty.hide();
    $loading.show();

    var url = c.API_URL + '/api/v1/civilians/search' +
      '?name=' + encodeURIComponent(term) +
      '&active_community_id=' + encodeURIComponent(c.communityId) +
      '&limit=' + SEARCH_LIMIT +
      '&page=0';

    $.ajax({
      url: url,
      method: 'GET',
      headers: {},
      success: function (data) {
        $loading.hide();
        ddCivData = parseList(data);
        ddCivPage = 0;
        ddCivTotal = ddCivData.length;
        renderGrid();
      },
      error: function () {
        $loading.hide();
        ddCivData = [];
        renderGrid();
        toast('Search failed', 'error');
      }
    });
  }

  /* ───────────────────────────────────────────
     Grid Rendering
     ─────────────────────────────────────────── */

  function renderGrid() {
    var $grid = $('#dd-civ-grid');
    var $empty = $('.dd-civ-empty-state');
    $grid.empty();

    if (!ddCivData.length) {
      $grid.hide();
      $empty.find('.dd-empty-title').text(ddCivSearchTerm ? 'No results found' : 'No civilians yet');
      $empty.find('.dd-empty-sub').text(ddCivSearchTerm ? 'Try a different search term' : 'Create your first civilian to get started');
      $empty.show();
      updatePagination();
      return;
    }

    $empty.hide();
    $grid.show();

    ddCivData.forEach(function (civ) {
      var name = esc(civ.firstName && civ.lastName ? civ.firstName + ' ' + civ.lastName : civ.name || 'Unknown');
      var age = calcAge(civ.birthday);
      var avatarInner = civ.image
        ? '<img src="' + esc(civ.image) + '" alt="" />'
        : initials(name);

      var statusCls = (approvalSystemEnabled && civ.approvalStatus) ? ' dd-civ-status-' + civ.approvalStatus : '';
      var badgeHtml = '';
      if (approvalSystemEnabled) {
        var badge = approvalBadge(civ.approvalStatus);
        badgeHtml = '<span class="dd-civ-badge ' + badge.cls + '">' + esc(badge.label) + '</span>';
      }
      // Economy: balance chip when the community has economy turned on.
      // We render it whether or not the field is initialized — uninitialized
      // civilians read as $0.00 until they're first touched by an economy flow.
      var balanceHtml = '';
      if (window.communityEconomyEnabled) {
        var bal = typeof civ.balance === 'number' ? civ.balance : 0;
        var negCls = bal < 0 ? ' dd-civ-balance-neg' : '';
        balanceHtml = '<span class="dd-civ-balance-chip' + negCls + '" title="Wallet balance">' +
          '<i class="fa fa-wallet" style="margin-right:0.3rem;opacity:0.7;"></i>' +
          esc(ddCivFmtBalance(bal)) +
        '</span>';
      }

      // Inbox indicator — only when economy is on. Hidden by default until
      // the pending-counts fetch resolves; updated in place by ddCivApplyInboxCounts.
      var inboxBtnHtml = '';
      if (window.communityEconomyEnabled) {
        inboxBtnHtml =
          '<button class="dd-civ-inbox-btn" data-civ-inbox="' + esc(civ._id) + '" title="Open inbox" aria-label="Open inbox">' +
            '<i class="fa fa-inbox"></i>' +
            '<span class="dd-civ-inbox-dot" data-civ-inbox-dot="' + esc(civ._id) + '" style="display:none;"></span>' +
            '<span class="dd-civ-inbox-count" data-civ-inbox-count="' + esc(civ._id) + '" style="display:none;">0</span>' +
          '</button>';
      }

      var html = '' +
        '<div class="dd-civ-card' + statusCls + '" data-civ-id="' + esc(civ._id) + '">' +
          '<div class="dd-civ-avatar">' + avatarInner + '</div>' +
          '<div class="dd-civ-info">' +
            '<div class="dd-civ-name">' + name + '</div>' +
            '<div class="dd-civ-meta">' +
              (age ? age + ' yrs' : '') +
              (age && civ.gender ? ' &middot; ' : '') +
              esc(civ.gender || '') +
              ((age || civ.gender) && civ.address ? ' &middot; ' : '') +
              esc(civ.address || '') +
            '</div>' +
            '<div class="dd-civ-card-chips">' +
              badgeHtml +
              balanceHtml +
            '</div>' +
          '</div>' +
          inboxBtnHtml +
        '</div>';

      $grid.append(html);
    });

    // Click handler for cards
    $grid.find('.dd-civ-card').off('click').on('click', function (e) {
      if ($(e.target).closest('.dd-civ-inbox-btn').length) return; // inbox button has its own handler
      var id = $(this).attr('data-civ-id');
      var civ = ddCivData.find(function (c) { return c._id === id; });
      if (civ) openDetailModal(civ);
    });
    // Inbox button → navigate to the per-civ inbox.
    $grid.find('.dd-civ-inbox-btn').off('click').on('click', function (e) {
      e.stopPropagation();
      var id = $(this).attr('data-civ-inbox');
      window.location.href = '/inbox?c=' + encodeURIComponent(ddCivEncodeId(id));
    });

    // Kick off pending-counts fetch + decorate cards once it returns.
    ddCivLoadInboxCounts();

    updatePagination();
  }

  function updatePagination() {
    var $pag = $('#dd-civ-pagination');
    var $prev = $('#dd-civ-prev');
    var $next = $('#dd-civ-next');
    var $info = $('#dd-civ-page-info');

    // Hide during search or when no data
    if (ddCivSearchTerm || !ddCivData.length) {
      $pag.hide();
      return;
    }

    $prev.prop('disabled', ddCivPage <= 0);

    if (ddCivTotal >= 0) {
      var totalPages = Math.ceil(ddCivTotal / PAGE_SIZE) || 1;
      $next.prop('disabled', ddCivPage >= totalPages - 1);
      $info.text('Page ' + (ddCivPage + 1) + ' of ' + totalPages);
      // Hide if only one page
      if (totalPages <= 1) { $pag.hide(); return; }
    } else {
      $next.prop('disabled', ddCivData.length < PAGE_SIZE);
      $info.text('Page ' + (ddCivPage + 1));
    }

    $pag.show();
  }

  /* ───────────────────────────────────────────
     Event Wiring
     ─────────────────────────────────────────── */

  function wireEvents() {
    // Prevent duplicate bindings by namespacing
    $(document).off('click.ddCivPrev').on('click.ddCivPrev', '#dd-civ-prev', function () {
      if (ddCivPage > 0) {
        ddCivPage--;
        loadCivilians();
      }
    });

    $(document).off('click.ddCivNext').on('click.ddCivNext', '#dd-civ-next', function () {
      ddCivPage++;
      loadCivilians();
    });

    $(document).off('input.ddCivSearch').on('input.ddCivSearch', '#dd-civ-search', function () {
      var term = $.trim($(this).val());
      ddCivSearchTerm = term;

      clearTimeout(ddCivSearchTimer);
      ddCivSearchTimer = setTimeout(function () {
        if (term.length >= 2) {
          searchCivilians(term);
        } else if (!term) {
          ddCivPage = 0;
          loadCivilians();
        }
      }, 350);
    });

    $(document).off('click.ddCivAdd').on('click.ddCivAdd', '#dd-civ-add-btn', function () {
      openNewCivilianModal();
    });
  }

  /* ───────────────────────────────────────────
     Detail Modal
     ─────────────────────────────────────────── */

  var $detailOverlay = null;
  var currentCiv = null;

  function ensureDetailModal() {
    if ($detailOverlay) return;

    var html = '' +
      '<div class="dd-civ-overlay" id="dd-civ-detail-overlay">' +
        '<div class="dd-civ-detail">' +
          '<div class="dd-civ-detail-header">' +
            '<div class="dd-civ-detail-avatar" id="dd-civ-d-avatar"></div>' +
            '<div class="dd-civ-detail-title">' +
              '<div class="dd-civ-detail-name" id="dd-civ-d-name"></div>' +
              '<div class="dd-civ-detail-sub" id="dd-civ-d-sub"></div>' +
            '</div>' +
            '<span id="dd-civ-d-balance" class="dd-civ-balance-chip" style="display:none;margin-right:0.4rem;align-self:center;"></span>' +
            '<a id="dd-civ-d-wallet" class="dd-civ-btn dd-civ-btn-secondary dd-civ-btn-small" href="#" style="margin-right:0.5rem;align-self:center;">' +
              '<i class="fa fa-wallet" style="margin-right:0.3rem;"></i>Wallet' +
            '</a>' +
            '<button class="dd-civ-close" id="dd-civ-d-close"><i class="fa fa-times"></i></button>' +
          '</div>' +
          '<div class="dd-civ-tabs" id="dd-civ-d-tabs"></div>' +
          '<div class="dd-civ-tab-body" id="dd-civ-d-body"></div>' +
          '<div class="dd-civ-detail-actions" id="dd-civ-d-actions"></div>' +
        '</div>' +
      '</div>';

    $('body').append(html);
    $detailOverlay = $('#dd-civ-detail-overlay');

    // Close handlers
    $detailOverlay.on('click', function (e) {
      if ($(e.target).is($detailOverlay)) closeDetailModal();
    });
    $detailOverlay.on('click', '#dd-civ-d-close', function () {
      closeDetailModal();
    });

    // Tab switching
    $detailOverlay.on('click', '.dd-civ-tab', function () {
      var tab = $(this).attr('data-tab');
      $detailOverlay.find('.dd-civ-tab').removeClass('dd-civ-tab-active');
      $(this).addClass('dd-civ-tab-active');
      // Only show the actions bar (Delete, Approval) on the Edit tab
      $('#dd-civ-d-actions').toggle(tab === 'edit');
      renderTabContent(tab);
    });
  }

  function openDetailModal(civ) {
    ensureDetailModal();
    currentCiv = civ;

    // Avatar
    var name = esc(civ.firstName && civ.lastName ? civ.firstName + ' ' + civ.lastName : civ.name || 'Unknown');
    var $av = $('#dd-civ-d-avatar');
    if (civ.image) {
      $av.html('<img src="' + esc(civ.image) + '" alt="" />');
    } else {
      $av.text(initials(name));
    }

    // Name & sub
    $('#dd-civ-d-name').text(civ.firstName && civ.lastName ? civ.firstName + ' ' + civ.lastName : civ.name || 'Unknown');
    var age = calcAge(civ.birthday);
    var sub = [age ? age + ' yrs' : '', civ.gender || '', civ.occupation || ''].filter(Boolean).join(' \u00b7 ');
    $('#dd-civ-d-sub').text(sub || 'Civilian');

    // Wallet entry point \u2014 points the standalone /wallet page at this civilian.
    $('#dd-civ-d-wallet').attr('href', '/wallet?civId=' + encodeURIComponent(civ._id));

    // Balance chip \u2014 only when economy is enabled for this community.
    var $bal = $('#dd-civ-d-balance');
    if (window.communityEconomyEnabled) {
      var bal = typeof civ.balance === 'number' ? civ.balance : 0;
      $bal.html('<i class="fa fa-wallet" style="margin-right:0.3rem;opacity:0.7;"></i>' + esc(ddCivFmtBalance(bal)))
        .toggleClass('dd-civ-balance-neg', bal < 0)
        .show();
    } else {
      $bal.hide();
    }

    // Tabs
    var tabs = [
      { key: 'edit', label: 'Edit', icon: 'fa-pen' },
      { key: 'vehicles', label: 'Vehicles', icon: 'fa-car' },
      { key: 'firearms', label: 'Firearms', icon: 'fa-crosshairs' },
      { key: 'licenses', label: 'Licenses', icon: 'fa-id-card' },
      { key: 'medical', label: 'Medical', icon: 'fa-medkit' },
      { key: 'records', label: 'Records', icon: 'fa-file-lines' }
    ];
    var tabsHtml = tabs.map(function (t, i) {
      return '<button class="dd-civ-tab' + (i === 0 ? ' dd-civ-tab-active' : '') + '" data-tab="' + t.key + '"><i class="fa ' + t.icon + '" style="margin-right:0.3rem;"></i>' + t.label + '</button>';
    }).join('');
    $('#dd-civ-d-tabs').html(tabsHtml);

    // Actions — only show approval UI when the community has the system enabled
    var actionsHtml = '';
    if (approvalSystemEnabled) {
      var badge = approvalBadge(civ.approvalStatus);
      var isRejectedOrEdits = ['rejected', 'denied', 'require_edits', 'requires_edits'].indexOf(civ.approvalStatus) >= 0;
      var approvalBtnLabel = isRejectedOrEdits ? 'Resubmit for Approval' : 'Send for Approval';
      var approvalBtnIcon = isRejectedOrEdits ? 'fa-rotate-right' : 'fa-paper-plane';
      actionsHtml += '<span class="dd-civ-badge ' + badge.cls + '" style="margin-right:auto;align-self:center;">' + esc(badge.label) + '</span>';
      actionsHtml += '<button class="dd-civ-btn dd-civ-btn-secondary dd-civ-btn-small" id="dd-civ-d-approval"><i class="fa ' + approvalBtnIcon + '" style="margin-right:0.3rem;"></i>' + approvalBtnLabel + '</button>';
    } else {
      actionsHtml += '<span style="margin-right:auto;"></span>';
    }
    actionsHtml += '<button class="dd-civ-btn dd-civ-btn-danger dd-civ-btn-small" id="dd-civ-d-delete"><i class="fa fa-trash" style="margin-right:0.3rem;"></i>Delete</button>';
    $('#dd-civ-d-actions').html(actionsHtml);

    // Action handlers
    $('#dd-civ-d-approval').off('click').on('click', function () { sendForApproval(civ._id); });
    $('#dd-civ-d-delete').off('click').on('click', function () { deleteCivilian(civ._id); });

    // Render first tab
    renderTabContent('edit');

    $detailOverlay.addClass('dd-civ-visible');
    $('body').css('overflow', 'hidden');
  }

  function closeDetailModal() {
    if ($detailOverlay) $detailOverlay.removeClass('dd-civ-visible');
    $('body').css('overflow', '');
    currentCiv = null;
  }

  /* ───────────────────────────────────────────
     Tab Rendering
     ─────────────────────────────────────────── */

  function renderTabContent(tab) {
    var $body = $('#dd-civ-d-body');
    switch (tab) {
      case 'edit':      renderEditTab($body); break;
      case 'vehicles':  renderVehiclesTab($body); break;
      case 'firearms':  renderFirearmsTab($body); break;
      case 'licenses':  renderLicensesTab($body); break;
      case 'medical':   renderMedicalTab($body); break;
      case 'records':   renderRecordsTab($body); break;
      default:          $body.empty();
    }
  }

  /* ── Edit Tab ── */

  function renderEditTab($body) {
    var c = currentCiv;
    if (!c) return;

    var genderOpts = ['', 'Male', 'Female', 'Other'].map(function (g) {
      return '<option value="' + g + '"' + (c.gender === g ? ' selected' : '') + '>' + (g || 'Select') + '</option>';
    }).join('');

    // Determine height mode: Imperial vs Metric
    var isImperial = c.heightClassification !== 'Metric';
    var heightFt = '', heightIn = '', heightCm = '';
    if (isImperial && c.height) {
      var totalIn = parseInt(c.height) || 0;
      heightFt = Math.floor(totalIn / 12) || '';
      heightIn = totalIn % 12;
      if (heightFt === 0 && heightIn === 0) { heightFt = ''; heightIn = ''; }
    } else if (!isImperial && c.height) {
      heightCm = c.height;
    }

    // Determine weight mode: lbs vs kg
    var isLbs = c.weightClassification !== 'kg';
    var weightLbs = '', weightKg = '';
    if (isLbs && c.weight) { weightLbs = c.weight; }
    else if (!isLbs && c.weight) { weightKg = c.weight; }

    // Age (read-only)
    var age = calcAge(c.birthday);

    // Approval warning — only when approval system is enabled
    var approvalWarningHtml = '';
    if (approvalSystemEnabled) {
      if (c.approvalStatus && ['rejected', 'denied', 'require_edits', 'requires_edits'].indexOf(c.approvalStatus) >= 0) {
        var notesHtml = c.approvalNotes
          ? '<div style="margin-top:0.5rem;padding:0.625rem 0.75rem;background:rgba(0,0,0,0.2);border-radius:6px;border-left:3px solid rgba(245,158,11,0.5);font-size:0.8125rem;color:#e2e8f0;line-height:1.5;width:100%;">' +
            '<div style="color:#fbbf24;font-size:0.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.25rem;">Admin Feedback</div>' +
            esc(c.approvalNotes) + '</div>'
          : '';
        approvalWarningHtml = '<div class="dd-civ-approval-warning dd-civ-form-full" style="flex-wrap:wrap;"><i class="fa fa-exclamation-triangle"></i> This civilian was returned for edits. Make your changes and resubmit for approval.' + notesHtml + '</div>';
      } else if (c.approvalStatus === 'requested_review' || c.approvalStatus === 'pending') {
        approvalWarningHtml = '<div class="dd-civ-approval-warning dd-civ-form-full"><i class="fa fa-clock"></i> This civilian is pending approval. Changes may require re-approval.</div>';
      }
    }

    // Photo section — avatar + "Details about your Civilian" label
    var photoHtml = '' +
      '<div class="dd-civ-form-full" style="display:flex;align-items:center;gap:1rem;margin-bottom:0.5rem;">' +
        '<div class="dd-civ-photo-upload" id="dd-civ-edit-photo-wrap" style="flex-shrink:0;">' +
          '<div style="width:64px;height:64px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;background:var(--dd-accent);font-size:1.25rem;font-weight:700;color:#fff;box-shadow:0 2px 8px rgba(59,130,246,0.15);" id="dd-civ-edit-photo-preview">' +
            (c.image ? '<img src="' + esc(c.image) + '" alt="" style="width:100%;height:100%;object-fit:cover;" />' : initials((c.firstName || '') + ' ' + (c.lastName || c.name || ''))) +
          '</div>' +
          '<div class="dd-civ-photo-overlay"><i class="fa fa-camera"></i></div>' +
          '<input type="file" accept="image/*" id="dd-civ-edit-photo-input" />' +
        '</div>' +
        '<div>' +
          '<div style="font-size:0.95rem;font-weight:600;color:var(--dd-text);">Details about your Civilian</div>' +
          '<div style="font-size:0.75rem;color:var(--dd-text-muted);">Click photo to change</div>' +
        '</div>' +
      '</div>';

    var html = '' +
      '<form id="dd-civ-edit-form" class="dd-civ-form-grid">' +
        approvalWarningHtml +
        photoHtml +
        '<input type="hidden" name="image" id="dd-civ-edit-photo-url" value="' + esc(c.image || '') + '" />' +

        /* ── Name, DOB, Age row (3 cols via inline flex) ── */
        '<div class="dd-civ-form-full" style="display:flex;gap:0.75rem;flex-wrap:wrap;">' +
          '<div class="dd-civ-field" style="flex:2 1 160px;min-width:120px;">' +
            '<label>Name *</label>' +
            '<input type="text" name="name" value="' + esc(c.name || ((c.firstName || '') + ' ' + (c.lastName || '')).trim()) + '" required placeholder="Full name" />' +
          '</div>' +
          '<div class="dd-civ-field" style="flex:1 1 130px;min-width:110px;">' +
            '<label>Date of Birth *</label>' +
            '<input type="date" name="birthday" value="' + esc(c.birthday ? c.birthday.substring(0, 10) : '') + '" required />' +
          '</div>' +
          '<div class="dd-civ-field" style="flex:0 0 60px;">' +
            '<label>Age</label>' +
            '<input type="text" value="' + esc(String(age)) + '" readonly style="opacity:0.6;cursor:default;" />' +
          '</div>' +
        '</div>' +

        /* ── Address, Occupation row ── */
        '<div class="dd-civ-field">' +
          '<label>Address</label>' +
          '<input type="text" name="address" value="' + esc(c.address || '') + '" placeholder="Address" />' +
        '</div>' +
        '<div class="dd-civ-field">' +
          '<label>Occupation</label>' +
          '<input type="text" name="occupation" value="' + esc(c.occupation || '') + '" placeholder="Occupation" />' +
        '</div>' +

        /* ── Advanced Details divider ── */
        '<div class="dd-civ-section-label">Advanced Details <span style="font-size:0.75rem;color:var(--dd-text-dim);">(Optional)</span></div>' +

        /* ── Gender + Height row ── */
        '<div class="dd-civ-field">' +
          '<label>Gender</label>' +
          '<select name="gender">' + genderOpts + '</select>' +
        '</div>' +
        '<div class="dd-civ-field">' +
          '<label>Height</label>' +
          '<div class="dd-civ-toggle-wrap">' +
            '<button type="button" class="dd-civ-toggle-btn dd-civ-height-toggle' + (isImperial ? ' active' : '') + '" data-value="imperial">Imperial (ft/in)</button>' +
            '<button type="button" class="dd-civ-toggle-btn dd-civ-height-toggle' + (!isImperial ? ' active' : '') + '" data-value="metric">Metric (cm)</button>' +
          '</div>' +
          '<div class="dd-civ-height-imperial" style="display:' + (isImperial ? 'flex' : 'none') + ';gap:0.5rem;">' +
            '<input type="number" name="heightFoot" min="0" placeholder="ft" value="' + esc(String(heightFt)) + '" style="width:70px;" />' +
            '<input type="number" name="heightInches" min="0" max="11" placeholder="in" value="' + esc(String(heightIn)) + '" style="width:70px;" />' +
          '</div>' +
          '<div class="dd-civ-height-metric" style="display:' + (!isImperial ? 'block' : 'none') + ';">' +
            '<input type="number" name="heightCm" min="0" placeholder="cm" value="' + esc(String(heightCm)) + '" style="width:140px;" />' +
          '</div>' +
        '</div>' +

        /* ── Weight row ── */
        '<div class="dd-civ-form-full">' +
          '<div class="dd-civ-field" style="max-width:280px;">' +
            '<label>Weight</label>' +
            '<div class="dd-civ-toggle-wrap">' +
              '<button type="button" class="dd-civ-toggle-btn dd-civ-weight-toggle' + (isLbs ? ' active' : '') + '" data-value="imperial">lbs</button>' +
              '<button type="button" class="dd-civ-toggle-btn dd-civ-weight-toggle' + (!isLbs ? ' active' : '') + '" data-value="metric">kg</button>' +
            '</div>' +
            '<div class="dd-civ-weight-imperial" style="display:' + (isLbs ? 'block' : 'none') + ';">' +
              '<input type="number" name="weightLbs" min="0" placeholder="lbs" value="' + esc(String(weightLbs)) + '" style="width:140px;" />' +
            '</div>' +
            '<div class="dd-civ-weight-metric" style="display:' + (!isLbs ? 'block' : 'none') + ';">' +
              '<input type="number" name="weightKg" min="0" placeholder="kg" value="' + esc(String(weightKg)) + '" style="width:140px;" />' +
            '</div>' +
          '</div>' +
        '</div>' +

        /* ── Checkboxes ── */
        '<div class="dd-civ-checkbox-row">' +
          '<label class="dd-civ-checkbox"><input type="checkbox" name="organDonor"' + (c.organDonor ? ' checked' : '') + ' /> Organ Donor</label>' +
          '<label class="dd-civ-checkbox"><input type="checkbox" name="veteran"' + (c.veteran ? ' checked' : '') + ' /> Veteran</label>' +
          '<label class="dd-civ-checkbox"><input type="checkbox" name="onParole"' + (c.onParole ? ' checked' : '') + ' /> On Parole</label>' +
          '<label class="dd-civ-checkbox"><input type="checkbox" name="onProbation"' + (c.onProbation ? ' checked' : '') + ' /> On Probation</label>' +
        '</div>' +

        /* ── Eye Color, Hair Color ── */
        '<div class="dd-civ-field">' +
          '<label>Eye Color</label>' +
          '<input type="text" name="eyeColor" value="' + esc(c.eyeColor || '') + '" placeholder="Eye Color" />' +
        '</div>' +
        '<div class="dd-civ-field">' +
          '<label>Hair Color</label>' +
          '<input type="text" name="hairColor" value="' + esc(c.hairColor || '') + '" placeholder="Hair Color" />' +
        '</div>' +

        '<div class="dd-civ-form-full" style="display:flex;justify-content:flex-end;margin-top:0.5rem;">' +
          '<button type="submit" class="dd-civ-btn dd-civ-btn-primary"><i class="fa fa-save" style="margin-right:0.3rem;"></i>Save Changes</button>' +
        '</div>' +
      '</form>';

    $body.html(html);

    // Form submit
    $('#dd-civ-edit-form').off('submit').on('submit', function (e) {
      e.preventDefault();
      saveCivilian();
    });

    // Height toggle
    $body.find('.dd-civ-height-toggle').on('click', function () {
      $body.find('.dd-civ-height-toggle').removeClass('active');
      $(this).addClass('active');
      var val = $(this).data('value');
      $body.find('.dd-civ-height-imperial').toggle(val === 'imperial');
      $body.find('.dd-civ-height-metric').toggle(val === 'metric');
    });


    // Weight toggle
    $body.find('.dd-civ-weight-toggle').on('click', function () {
      $body.find('.dd-civ-weight-toggle').removeClass('active');
      $(this).addClass('active');
      var val = $(this).data('value');
      $body.find('.dd-civ-weight-imperial').toggle(val === 'imperial');
      $body.find('.dd-civ-weight-metric').toggle(val === 'metric');
    });

    // Photo upload handler — file input is a child of the wrap, so stop its
    // click from bubbling back up (which would cause an infinite loop).
    $('#dd-civ-edit-photo-input').off('click').on('click', function (e) {
      e.stopPropagation();
    });
    $('#dd-civ-edit-photo-wrap').off('click').on('click', function () {
      document.getElementById('dd-civ-edit-photo-input').click();
    });
    $('#dd-civ-edit-photo-input').off('change').on('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!window.uploadToCloudinary) {
        toast('Photo upload not configured', 'error');
        return;
      }
      var $preview = $('#dd-civ-edit-photo-preview');
      $preview.html('<i class="fa fa-spinner fa-spin" style="color:var(--dd-text-muted);"></i>');
      window.uploadToCloudinary(file, 'civilians', null)
        .then(function (url) {
          $preview.html('<img src="' + esc(url) + '" alt="" style="width:100%;height:100%;object-fit:cover;" />');
          $('#dd-civ-edit-photo-url').val(url);
          toast('Photo uploaded', 'success');
        })
        .catch(function () {
          $preview.html(initials((currentCiv.firstName || '') + ' ' + (currentCiv.lastName || '')));
          toast('Photo upload failed', 'error');
        });
    });
  }

  function saveCivilian() {
    if (!currentCiv) return;
    var c = cfg();
    var $form = $('#dd-civ-edit-form');

    // Height: convert ft/in to total inches or use cm directly
    var heightMode = $form.find('.dd-civ-height-toggle.active').data('value');
    var height, heightClassification;
    if (heightMode === 'metric') {
      var cm = parseInt($form.find('[name="heightCm"]').val()) || 0;
      height = cm > 0 ? String(cm) : undefined;
      heightClassification = 'Metric';
    } else {
      var ft = parseInt($form.find('[name="heightFoot"]').val()) || 0;
      var inches = parseInt($form.find('[name="heightInches"]').val()) || 0;
      var totalIn = ft * 12 + inches;
      height = totalIn > 0 ? String(totalIn) : undefined;
      heightClassification = 'Imperial';
    }

    // Weight
    var weightMode = $form.find('.dd-civ-weight-toggle.active').data('value');
    var weight, weightClassification;
    if (weightMode === 'metric') {
      var kg = parseInt($form.find('[name="weightKg"]').val()) || 0;
      weight = kg > 0 ? String(kg) : undefined;
      weightClassification = 'kg';
    } else {
      var lbs = parseInt($form.find('[name="weightLbs"]').val()) || 0;
      weight = lbs > 0 ? String(lbs) : undefined;
      weightClassification = 'lbs';
    }

    var fullName = $.trim($form.find('[name="name"]').val());

    var payload = {
      name: fullName,
      firstName: fullName.split(' ')[0] || '',
      lastName: fullName.split(' ').slice(1).join(' ') || '',
      birthday: $form.find('[name="birthday"]').val(),
      gender: $form.find('[name="gender"]').val(),
      address: $form.find('[name="address"]').val(),
      occupation: $form.find('[name="occupation"]').val(),
      eyeColor: $form.find('[name="eyeColor"]').val(),
      hairColor: $form.find('[name="hairColor"]').val(),
      height: height,
      heightClassification: heightClassification,
      weight: weight,
      weightClassification: weightClassification,
      organDonor: $form.find('[name="organDonor"]').is(':checked'),
      veteran: $form.find('[name="veteran"]').is(':checked'),
      onParole: $form.find('[name="onParole"]').is(':checked'),
      onProbation: $form.find('[name="onProbation"]').is(':checked'),
      image: $form.find('[name="image"]').val() || ''
    };

    $.ajax({
      url: c.API_URL + '/api/v1/civilian/' + currentCiv._id,
      method: 'PUT',
      headers: {},
      contentType: 'application/json',
      data: JSON.stringify(payload),
      success: function () {
        toast('Civilian updated', 'success');
        // Update local data
        $.extend(currentCiv, payload);
        // Refresh list
        if (ddCivSearchTerm) {
          searchCivilians(ddCivSearchTerm);
        } else {
          loadCivilians();
        }
      },
      error: function () {
        toast('Failed to update civilian', 'error');
      }
    });
  }

  /* ── Vehicles Tab ── */

  function renderVehiclesTab($body) {
    var c = cfg();
    $body.html('<div class="dd-civ-empty"><i class="fa fa-spinner fa-spin"></i><p>Loading vehicles...</p></div>');

    $.ajax({
      url: c.API_URL + '/api/v1/vehicles/user/' + c.userId +
        '?active_community_id=' + encodeURIComponent(c.communityId) +
        '&limit=50&page=0',
      method: 'GET',
      headers: {},
      success: function (data) {
        var all = (data.data || data.vehicles || data || []);
        if (!Array.isArray(all)) all = [];

        var linked = [];
        var civId = currentCiv ? currentCiv._id : '';

        all.forEach(function (v) {
          var det = v.vehicle || v.details || v;
          var flat = $.extend({}, det);
          flat._id = v._id || v.id || '';
          if (flat.linkedCivilianID === civId || flat.registeredOwnerID === civId) {
            linked.push(flat);
          }
        });

        // Top bar: label left, search right
        var topBar = buildVehicleLinkBar();

        if (!linked.length) {
          $body.html(
            topBar +
            '<div class="dd-civ-empty"><i class="fa fa-car"></i><p>No vehicles linked to this civilian.</p></div>'
          );
          wireVehicleLinkSearch($body, all);
          return;
        }

        var cards = linked.map(function (v) {
          // Title: plate (always present)
          var title = esc(v.plate || 'N/A');

          // Meta line: collect available fields separated by middots
          var meta = [];
          var ymm = [v.year, v.make, v.model].filter(Boolean).map(function(p) { return esc(p); }).join(' ');
          if (ymm) meta.push(ymm);
          if (v.type) meta.push(esc(v.type));
          if (v.color) meta.push('Color: ' + esc(v.color));
          if (v.vin) meta.push('VIN: ' + esc(v.vin));
          if (v.licensePlateState) meta.push(esc(v.licensePlateState));
          var metaStr = meta.length ? meta.join(' &middot; ') : 'No details';

          // Stolen indicator changes icon color
          var isStolen = v.isStolen === true || v.isStolen === 'true';
          var iconColor = isStolen ? 'var(--dd-red)' : 'var(--dd-green)';
          var stolenBadge = isStolen ? ' <span style="color:var(--dd-red);font-size:0.6rem;font-weight:700;text-transform:uppercase;margin-left:0.3rem;">STOLEN</span>' : '';

          return '' +
            '<div class="dd-civ-sub-card">' +
              '<i class="fa fa-car" style="color:' + iconColor + ';font-size:1.1rem;"></i>' +
              '<div class="dd-civ-sub-card-info">' +
                '<div class="dd-civ-sub-card-title">' + title + stolenBadge + '</div>' +
                '<div class="dd-civ-sub-card-meta">' + metaStr + '</div>' +
              '</div>' +
              '<button class="dd-civ-btn dd-civ-btn-secondary dd-civ-btn-small dd-civ-delink-veh" data-veh-id="' + esc(v._id) + '" title="Unlink vehicle"><i class="fa fa-unlink"></i></button>' +
            '</div>';
        }).join('');

        $body.html(topBar + cards);
        wireVehicleLinkSearch($body, all);

        // Delink handler
        $body.find('.dd-civ-delink-veh').off('click').on('click', function () {
          var vehId = $(this).attr('data-veh-id');
          delinkVehicle(vehId, $body);
        });
      },
      error: function () {
        $body.html('<div class="dd-civ-empty"><i class="fa fa-exclamation-triangle"></i><p>Failed to load vehicles.</p></div>');
      }
    });
  }

  function buildVehicleCard(v, mode) {
    var isStolen = v.isStolen === true || v.isStolen === 'true';
    var iconClass = isStolen ? 'veh-stolen' : 'veh-ok';
    var sep = '<span class="dd-veh-sep">&middot;</span>';

    // Collect meta parts (everything except plate)
    var metaParts = [];
    if (v.licensePlateState) metaParts.push('<span class="dd-veh-plate-state">' + esc(v.licensePlateState) + '</span>');
    var ymm = [v.year, v.make, v.model].filter(Boolean).map(function(p) { return esc(p); }).join(' ');
    if (ymm) metaParts.push('<span class="dd-veh-card-desc">' + ymm + '</span>');
    if (v.type) metaParts.push('<span class="dd-veh-card-desc">' + esc(v.type) + '</span>');
    if (v.color) metaParts.push('<span class="dd-veh-card-detail"><i class="fa fa-palette"></i> ' + esc(v.color) + '</span>');
    if (v.vin) metaParts.push('<span class="dd-veh-card-detail"><i class="fa fa-barcode"></i> ' + esc(v.vin) + '</span>');

    // Status badges
    var badges = '';
    if (isStolen) badges += '<span class="dd-veh-badge badge-stolen"><i class="fa fa-exclamation-triangle"></i> Stolen</span>';
    if (v.isExempt === true || v.isExempt === 'true') badges += '<span class="dd-veh-badge badge-exempt"><i class="fa fa-shield"></i> Exempt</span>';
    if (v.validRegistration === false || v.validRegistration === 'false') badges += '<span class="dd-veh-badge badge-reg"><i class="fa fa-file-circle-xmark"></i> Invalid Reg</span>';
    if (v.validInsurance === false || v.validInsurance === 'false') badges += '<span class="dd-veh-badge badge-ins"><i class="fa fa-file-shield"></i> No Insurance</span>';

    // Action button
    var action = '';
    if (mode === 'linked') {
      action = '<div class="dd-veh-card-action"><button class="dd-civ-btn dd-civ-btn-secondary dd-civ-btn-small dd-civ-delink-veh" data-veh-id="' + esc(v._id) + '" title="Unlink vehicle"><i class="fa fa-unlink"></i></button></div>';
    } else {
      action = '<div class="dd-veh-card-action"><i class="fa fa-link" style="color:var(--dd-accent);font-size:0.85rem;"></i></div>';
    }

    var dataAttr = mode === 'search' ? ' data-link-veh-id="' + esc(v._id) + '"' : '';
    var bodyHtml = '';

    if (mode === 'search') {
      // Dropdown: stacked layout — plate on top, meta line below
      bodyHtml = '<div class="dd-veh-card-plate">' + esc(v.plate || 'N/A') + '</div>';
      if (metaParts.length) bodyHtml += '<div class="dd-veh-meta-line">' + metaParts.join(sep) + '</div>';
      if (badges) bodyHtml += '<div class="dd-veh-badges">' + badges + '</div>';
    } else {
      // Linked list: compact single row — plate + meta inline
      var rowParts = ['<span class="dd-veh-card-plate">' + esc(v.plate || 'N/A') + '</span>'];
      rowParts = rowParts.concat(metaParts);
      bodyHtml = '<div class="dd-veh-card-row">' + rowParts.join(sep) + '</div>';
      if (badges) bodyHtml += '<div class="dd-veh-badges">' + badges + '</div>';
    }

    return '' +
      '<div class="dd-veh-card"' + dataAttr + '>' +
        '<div class="dd-veh-card-icon ' + iconClass + '"><i class="fa fa-car"></i></div>' +
        '<div class="dd-veh-card-body">' + bodyHtml + '</div>' +
        action +
      '</div>';
  }

  function buildVehicleLinkBar() {
    return '' +
      '<div class="dd-civ-link-bar">' +
        '<div class="dd-civ-link-bar-label">Linked Vehicles</div>' +
        '<div class="dd-civ-link-search-wrap">' +
          '<input type="text" class="dd-civ-search" id="dd-civ-veh-link-search" placeholder="Search to link..." autocomplete="off" />' +
          '<i class="fa fa-search dd-link-search-icon"></i>' +
          '<div class="dd-civ-link-results" id="dd-civ-veh-link-results"></div>' +
        '</div>' +
      '</div>';
  }

  function wireVehicleLinkSearch($body, allVehicles) {
    var civId = currentCiv ? currentCiv._id : '';
    $body.find('#dd-civ-veh-link-search').off('input').on('input', function () {
      var term = $.trim($(this).val()).toLowerCase();
      var $results = $body.find('#dd-civ-veh-link-results');

      if (term.length < 2) {
        $results.empty();
        return;
      }

      var matches = [];
      allVehicles.forEach(function (v) {
        var det = v.vehicle || v.details || v;
        var flat = $.extend({}, det);
        flat._id = v._id || v.id || '';
        if (flat.linkedCivilianID === civId || flat.registeredOwnerID === civId) return; // already linked

        var searchStr = ((flat.plate || '') + ' ' + (flat.make || '') + ' ' + (flat.model || '') + ' ' + (flat.year || '') + ' ' + (flat.color || '') + ' ' + (flat.vin || '')).toLowerCase();
        if (searchStr.indexOf(term) !== -1) matches.push(flat);
      });

      if (!matches.length) {
        $results.html('<div style="font-size:0.75rem;color:var(--dd-text-muted);padding:0.5rem 0.75rem;">No unlinked vehicles found.</div>');
        return;
      }

      var html = matches.slice(0, 5).map(function (v) {
        return buildVehicleCard(v, 'search');
      }).join('');

      $results.html(html);

      $results.find('[data-link-veh-id]').off('click').on('click', function () {
        var vehId = $(this).attr('data-link-veh-id');
        linkVehicle(vehId, $body);
      });
    });
  }

  function linkVehicle(vehId, $body) {
    var c = cfg();
    $.ajax({
      url: c.API_URL + '/api/v1/vehicle/' + vehId,
      method: 'PUT',
      headers: {},
      contentType: 'application/json',
      data: JSON.stringify({ linkedCivilianID: currentCiv._id }),
      success: function () {
        toast('Vehicle linked', 'success');
        renderVehiclesTab($body);
      },
      error: function () {
        toast('Failed to link vehicle', 'error');
      }
    });
  }

  function delinkVehicle(vehId, $body) {
    var c = cfg();
    $.ajax({
      url: c.API_URL + '/api/v1/vehicle/' + vehId,
      method: 'PUT',
      headers: {},
      contentType: 'application/json',
      data: JSON.stringify({ linkedCivilianID: '' }),
      success: function () {
        toast('Vehicle unlinked', 'success');
        renderVehiclesTab($body);
      },
      error: function () {
        toast('Failed to unlink vehicle', 'error');
      }
    });
  }

  /* ── Firearms Tab ── */

  function renderFirearmsTab($body) {
    var c = cfg();
    $body.html('<div class="dd-civ-empty"><i class="fa fa-spinner fa-spin"></i><p>Loading firearms...</p></div>');

    $.ajax({
      url: c.API_URL + '/api/v1/firearms/user/' + c.userId +
        '?active_community_id=' + encodeURIComponent(c.communityId) +
        '&limit=50&page=0',
      method: 'GET',
      headers: {},
      success: function (data) {
        var all = (data.data || data.firearms || data || []);
        if (!Array.isArray(all)) all = [];

        var linked = [];
        var civId = currentCiv ? currentCiv._id : '';

        all.forEach(function (f) {
          var det = f.firearm || f.details || f;
          var flat = $.extend({}, det);
          flat._id = f._id || f.id || '';
          if (flat.linkedCivilianID === civId || flat.registeredOwnerID === civId) {
            linked.push(flat);
          }
        });

        // Top bar: label left, search right
        var topBar = buildFirearmLinkBar();

        if (!linked.length) {
          $body.html(
            topBar +
            '<div class="dd-civ-empty"><i class="fa fa-crosshairs"></i><p>No firearms linked to this civilian.</p></div>'
          );
          wireFirearmLinkSearch($body, all);
          return;
        }

        var cards = linked.map(function (f) {
          return '' +
            '<div class="dd-civ-sub-card">' +
              '<i class="fa fa-crosshairs" style="color:var(--dd-red);font-size:1.1rem;"></i>' +
              '<div class="dd-civ-sub-card-info">' +
                '<div class="dd-civ-sub-card-title">' + esc(f.name || 'Unknown Firearm') + '</div>' +
                '<div class="dd-civ-sub-card-meta">' +
                  'Type: ' + esc(f.weaponType || 'N/A') + ' &middot; Caliber: ' + esc(f.caliber || 'N/A') +
                  ' &middot; S/N: ' + esc(f.serialNumber || 'N/A') +
                '</div>' +
              '</div>' +
              '<button class="dd-civ-btn dd-civ-btn-secondary dd-civ-btn-small dd-civ-delink-fa" data-fa-id="' + esc(f._id) + '" title="Unlink firearm"><i class="fa fa-unlink"></i></button>' +
            '</div>';
        }).join('');

        $body.html(topBar + cards);
        wireFirearmLinkSearch($body, all);

        // Delink handler
        $body.find('.dd-civ-delink-fa').off('click').on('click', function () {
          var faId = $(this).attr('data-fa-id');
          delinkFirearm(faId, $body);
        });
      },
      error: function () {
        $body.html('<div class="dd-civ-empty"><i class="fa fa-exclamation-triangle"></i><p>Failed to load firearms.</p></div>');
      }
    });
  }

  function buildFirearmLinkBar() {
    return '' +
      '<div class="dd-civ-link-bar">' +
        '<div class="dd-civ-link-bar-label">Linked Firearms</div>' +
        '<div class="dd-civ-link-search-wrap">' +
          '<input type="text" class="dd-civ-search" id="dd-civ-fa-link-search" placeholder="Search to link..." autocomplete="off" />' +
          '<i class="fa fa-search dd-link-search-icon"></i>' +
          '<div class="dd-civ-link-results" id="dd-civ-fa-link-results"></div>' +
        '</div>' +
      '</div>';
  }

  function wireFirearmLinkSearch($body, allFirearms) {
    var civId = currentCiv ? currentCiv._id : '';
    $body.find('#dd-civ-fa-link-search').off('input').on('input', function () {
      var term = $.trim($(this).val()).toLowerCase();
      var $results = $body.find('#dd-civ-fa-link-results');

      if (term.length < 2) {
        $results.empty();
        return;
      }

      var matches = [];
      allFirearms.forEach(function (f) {
        var det = f.firearm || f.details || f;
        var flat = $.extend({}, det);
        flat._id = f._id || f.id || '';
        if (flat.linkedCivilianID === civId || flat.registeredOwnerID === civId) return;

        var searchStr = ((flat.name || '') + ' ' + (flat.serialNumber || '') + ' ' + (flat.weaponType || '')).toLowerCase();
        if (searchStr.indexOf(term) !== -1) matches.push(flat);
      });

      if (!matches.length) {
        $results.html('<div style="font-size:0.75rem;color:var(--dd-text-muted);padding:0.5rem 0.75rem;">No unlinked firearms found.</div>');
        return;
      }

      var html = matches.slice(0, 5).map(function (f) {
        return '' +
          '<div class="dd-civ-sub-card" style="cursor:pointer;margin:0;border-radius:0;border-bottom:1px solid var(--dd-glass-border);" data-link-fa-id="' + esc(f._id) + '">' +
            '<i class="fa fa-crosshairs" style="color:var(--dd-text-muted);"></i>' +
            '<div class="dd-civ-sub-card-info">' +
              '<div class="dd-civ-sub-card-title">' + esc(f.name || 'Unknown') + '</div>' +
              '<div class="dd-civ-sub-card-meta">S/N: ' + esc(f.serialNumber || 'N/A') + '</div>' +
            '</div>' +
            '<i class="fa fa-link" style="color:var(--dd-accent);"></i>' +
          '</div>';
      }).join('');

      $results.html(html);

      $results.find('[data-link-fa-id]').off('click').on('click', function () {
        var faId = $(this).attr('data-link-fa-id');
        linkFirearm(faId, $body);
      });
    });
  }

  function linkFirearm(faId, $body) {
    var c = cfg();
    $.ajax({
      url: c.API_URL + '/api/v1/firearm/' + faId,
      method: 'PUT',
      headers: {},
      contentType: 'application/json',
      data: JSON.stringify({ linkedCivilianID: currentCiv._id }),
      success: function () {
        toast('Firearm linked', 'success');
        renderFirearmsTab($body);
      },
      error: function () {
        toast('Failed to link firearm', 'error');
      }
    });
  }

  function delinkFirearm(faId, $body) {
    var c = cfg();
    $.ajax({
      url: c.API_URL + '/api/v1/firearm/' + faId,
      method: 'PUT',
      headers: {},
      contentType: 'application/json',
      data: JSON.stringify({ linkedCivilianID: '' }),
      success: function () {
        toast('Firearm unlinked', 'success');
        renderFirearmsTab($body);
      },
      error: function () {
        toast('Failed to unlink firearm', 'error');
      }
    });
  }

  /* ── Records Tab ── */

  var cachedArrests = null;
  var recordsFilter = 'all';

  function renderRecordsTab($body) {
    var c = currentCiv;
    if (!c) return;

    recordsFilter = 'all';
    cachedArrests = null;
    $body.html('<div class="dd-civ-empty"><i class="fa fa-spinner fa-spin"></i><p>Loading records...</p></div>');

    // Fetch arrest reports for this civilian
    var conf = cfg();
    $.ajax({
      url: conf.API_URL + '/api/v1/arrest-report/arrestee/' + c._id,
      method: 'GET',
      success: function (data) {
        var raw = data.data || [];
        cachedArrests = raw.map(function (r) {
          var ar = r.arrestReport ? $.extend({ _id: r._id }, r.arrestReport) : r;
          ar._recordSource = 'arrest';
          return ar;
        });
        renderRecordsContent($body);
      },
      error: function () {
        cachedArrests = [];
        renderRecordsContent($body);
      }
    });
  }

  function renderRecordsContent($body) {
    var c = currentCiv;
    if (!c) return;

    var citations = (c.criminalHistory || []).filter(function (r) { return !r.redacted && r.type === 'Citation'; });
    var warnings = (c.criminalHistory || []).filter(function (r) { return !r.redacted && r.type === 'Warning'; });
    var arrests = cachedArrests || [];

    var allCount = citations.length + warnings.length + arrests.length;

    // Filter bar
    var html = '' +
      '<div class="dd-rec-filters">' +
        '<button class="dd-rec-filter-btn' + (recordsFilter === 'all' ? ' active' : '') + '" data-filter="all">All (' + allCount + ')</button>' +
        '<button class="dd-rec-filter-btn' + (recordsFilter === 'Citation' ? ' active' : '') + '" data-filter="Citation">Citations (' + citations.length + ')</button>' +
        '<button class="dd-rec-filter-btn' + (recordsFilter === 'Warning' ? ' active' : '') + '" data-filter="Warning">Warnings (' + warnings.length + ')</button>' +
        '<button class="dd-rec-filter-btn' + (recordsFilter === 'Arrest' ? ' active' : '') + '" data-filter="Arrest">Arrests (' + arrests.length + ')</button>' +
      '</div>';

    // Contest button (hidden until selections are made)
    html += '<button class="dd-rec-contest-btn" id="dd-rec-contest-btn"><i class="fa fa-gavel"></i> Contest Selected (<span id="dd-rec-contest-count">0</span>)</button>';

    // Determine which entries to show
    var entries = [];
    if (recordsFilter === 'all' || recordsFilter === 'Citation') {
      entries = entries.concat(citations.map(function (r) { r._recordSource = 'citation'; return r; }));
    }
    if (recordsFilter === 'all' || recordsFilter === 'Warning') {
      entries = entries.concat(warnings.map(function (r) { r._recordSource = 'warning'; return r; }));
    }
    if (recordsFilter === 'all' || recordsFilter === 'Arrest') {
      entries = entries.concat(arrests);
    }

    // Sort newest first
    entries.sort(function (a, b) {
      return new Date(b.createdAt || b.arrestDate || 0) - new Date(a.createdAt || a.arrestDate || 0);
    });

    // Contest hint if any entries are contestable
    var hasContestable = entries.some(function (r) { return isContestable(r); });
    if (hasContestable) {
      html += '<div class="dd-rec-contest-hint"><i class="fa fa-info-circle" style="color:var(--dd-amber);"></i><span>Select records to contest, then click <strong>Contest Selected</strong> to submit to a judge.</span></div>';
    }

    if (!entries.length) {
      html += '<div class="dd-civ-empty"><i class="fa fa-file-lines"></i><p>No records found.</p></div>';
    } else {
      html += entries.map(function (r) {
        return buildRecordCard(r);
      }).join('');
    }

    $body.html(html);
    wireRecordsEvents($body);
  }

  function isContestable(entry) {
    return entry.status !== 'dismissed' && entry.status !== 'contested' && entry.status !== 'upheld';
  }

  function buildRecordCard(r) {
    var isArrest = r._recordSource === 'arrest';
    var type = isArrest ? 'Arrest' : (r.type || 'Record');
    var itemType = isArrest ? 'arrest' : type.toLowerCase();
    var date = isArrest ? (r.arrestDate || r.createdAt) : r.createdAt;
    var isDismissed = r.status === 'dismissed';
    var cardOpacity = isDismissed ? 'opacity:0.6;' : '';

    var statusHtml = '';
    if (r.status === 'dismissed') {
      statusHtml = '<span class="dd-civ-record-status dd-civ-record-dismissed">Dismissed' + (r.dismissedBy ? ' by ' + esc(r.dismissedBy) : '') + '</span>';
    } else if (r.status === 'contested') {
      statusHtml = '<span class="dd-civ-record-status dd-civ-record-contested">Contested</span>';
    } else if (r.status === 'upheld') {
      statusHtml = '<span class="dd-civ-record-status dd-civ-record-upheld">Upheld' + (r.dismissedBy ? ' by Judge ' + esc(r.dismissedBy) : '') + '</span>';
    }

    var contestHtml = '';
    if (isContestable(r)) {
      var itemId = r._id || '';
      contestHtml = '' +
        '<div class="dd-rec-contest-area">' +
          '<input type="checkbox" class="dd-rec-contest-cb" data-item-id="' + esc(itemId) + '" data-item-type="' + itemType + '" />' +
          '<span class="dd-rec-contest-label">Contest</span>' +
        '</div>';
    }

    var bodyHtml = '';
    if (isArrest) {
      bodyHtml = '' +
        (r.charges ? '<div class="dd-civ-record-notes"><strong>Charges:</strong> ' + esc(r.charges) + '</div>' : '') +
        (r.arrestLocation ? '<div class="dd-civ-record-notes"><strong>Location:</strong> ' + esc(r.arrestLocation) + '</div>' : '');
    } else {
      bodyHtml = (r.notes ? '<div class="dd-civ-record-notes">' + esc(r.notes) + '</div>' : '');
      if (r.fines && r.fines.length) {
        bodyHtml += '<div class="dd-civ-record-fines">' +
          r.fines.map(function (f) {
            return '<span class="dd-civ-fine-tag">' + esc(f.fineType || 'Fine') + ': $' + (f.fineAmount || 0) + (f.category ? ' (' + esc(f.category) + ')' : '') + '</span>';
          }).join('') +
        '</div>';
      }
    }

    var icon = isArrest ? 'fa-handcuffs' : (type === 'Warning' ? 'fa-triangle-exclamation' : 'fa-file-lines');

    var recordId = r._id || '';
    // The toggle that gates this UI is the *dashboard's* department, not the
    // record's original issuer. From a civilian's perspective on Civvies23,
    // Civvies23's policy decides whether they can delete records here, even
    // if the citation was issued by Police Dept.
    var canDelete = canDeleteRecord({ departmentId: cfg().departmentId || '' });
    var deleteHtml = canDelete
      ? ('<button class="dd-civ-btn dd-civ-btn-danger dd-civ-btn-small dd-rec-delete" ' +
          'data-rec-id="' + esc(recordId) + '" data-rec-type="' + (isArrest ? 'arrest' : 'citation') + '" ' +
          'title="Delete" style="padding:0.25rem 0.4rem;font-size:0.6875rem;">' +
          '<i class="fa fa-trash"></i>' +
        '</button>')
      : '';

    return '' +
      '<div class="dd-civ-record" style="' + cardOpacity + '">' +
        '<div class="dd-civ-record-header">' +
          '<span class="dd-civ-record-type"><i class="fa ' + icon + '" style="margin-right:0.3rem;color:var(--dd-text-muted);"></i>' + esc(type) + statusHtml + '</span>' +
          '<span style="display:flex;align-items:center;gap:0.5rem;">' +
            '<span class="dd-civ-record-date">' + fmtDate(date) + '</span>' +
            deleteHtml +
          '</span>' +
        '</div>' +
        bodyHtml +
        contestHtml +
      '</div>';
  }

  function wireRecordsEvents($body) {
    // Filter buttons
    $body.find('.dd-rec-filter-btn').off('click').on('click', function () {
      recordsFilter = $(this).attr('data-filter');
      renderRecordsContent($body);
    });

    // Contest checkboxes
    $body.on('change', '.dd-rec-contest-cb', function () {
      var $card = $(this).closest('.dd-civ-record');
      $card.toggleClass('dd-rec-selected', $(this).is(':checked'));
      updateContestBtn($body);
    });

    // Click card to toggle checkbox
    $body.on('click', '.dd-civ-record', function (e) {
      if ($(e.target).is('.dd-rec-contest-cb') || $(e.target).hasClass('dd-rec-contest-label')) return;
      if ($(e.target).closest('.dd-rec-delete').length) return;
      var $cb = $(this).find('.dd-rec-contest-cb');
      if ($cb.length) {
        $cb.prop('checked', !$cb.prop('checked')).trigger('change');
      }
    });

    // Delete record buttons
    $body.on('click', '.dd-rec-delete', function (e) {
      e.stopPropagation();
      var $btn = $(this);
      var recId = $btn.attr('data-rec-id');
      var recType = $btn.attr('data-rec-type');
      var doDelete = function () {
        var conf = cfg();
        var url;
        if (recType === 'arrest') {
          url = conf.API_URL + '/api/v1/arrest-report/' + encodeURIComponent(recId);
        } else {
          url = conf.API_URL + '/api/v1/civilian/' + encodeURIComponent(currentCiv._id) + '/criminal-history/' + encodeURIComponent(recId);
        }
        $.ajax({
          url: url,
          method: 'DELETE',
          success: function () {
            toast('Record deleted', 'success');
            if (recType === 'arrest') {
              cachedArrests = cachedArrests.filter(function (a) { return (a._id || '') !== recId; });
              renderRecordsContent($body);
            } else {
              currentCiv.criminalHistory = (currentCiv.criminalHistory || []).filter(function (r) { return (r._id || '') !== recId; });
              renderRecordsContent($body);
            }
          },
          error: function (xhr) {
            if (isRecordDeletionRestrictedError(xhr)) {
              showRecordDeletionRestrictedModal();
              return;
            }
            toast('Failed to delete record', 'error');
          }
        });
      };
      if (window.ddModal) {
        window.ddModal({
          type: 'danger', icon: 'fa-trash', title: 'Delete Record',
          message: 'Are you sure you want to delete this record? This cannot be undone.',
          confirmText: 'Delete',
          onConfirm: doDelete
        });
      } else if (confirm('Delete this record?')) {
        doDelete();
      }
    });

    // Contest button
    $body.find('#dd-rec-contest-btn').off('click').on('click', function () {
      var items = [];
      $body.find('.dd-rec-contest-cb:checked').each(function () {
        var $card = $(this).closest('.dd-civ-record');
        var itemId = $(this).attr('data-item-id');
        var itemType = $(this).attr('data-item-type');
        // Build summary from the card content
        var summary = '';
        var fines = [];
        $card.find('.dd-civ-fine-tag').each(function () { fines.push($(this).text()); });
        if (fines.length) {
          summary = fines.join(', ');
        } else {
          summary = $card.find('.dd-civ-record-type').text().trim() || itemType;
        }
        items.push({ itemID: itemId, itemType: itemType, summary: summary });
      });
      if (items.length) openContestModal(items);
    });
  }

  function updateContestBtn($body) {
    var count = $body.find('.dd-rec-contest-cb:checked').length;
    var $btn = $body.find('#dd-rec-contest-btn');
    $btn.find('#dd-rec-contest-count').text(count);
    $btn.toggleClass('visible', count > 0);
  }

  /* ── Contest Modal ── */

  function openContestModal(items) {
    // Remove any existing contest modal
    $('#dd-contest-overlay').remove();

    var itemsHtml = items.map(function (item) {
      var bgColor = item.itemType === 'arrest' ? 'rgba(239,68,68,0.15)' : item.itemType === 'citation' ? 'rgba(99,102,241,0.15)' : 'rgba(245,158,11,0.15)';
      var textColor = item.itemType === 'arrest' ? 'var(--dd-red)' : item.itemType === 'citation' ? 'var(--dd-blue)' : 'var(--dd-amber)';
      return '' +
        '<div style="background:var(--dd-glass);border:1px solid var(--dd-glass-border);border-radius:8px;padding:0.6rem 0.75rem;margin-bottom:0.4rem;display:flex;align-items:center;gap:0.6rem;">' +
          '<span style="display:inline-block;background:' + bgColor + ';color:' + textColor + ';font-size:0.6875rem;padding:0.15rem 0.45rem;border-radius:4px;text-transform:capitalize;">' + esc(item.itemType) + '</span>' +
          '<span style="color:var(--dd-text);font-size:0.8125rem;">' + esc(item.summary) + '</span>' +
        '</div>';
    }).join('');

    var html = '' +
      '<div class="dd-civ-overlay dd-civ-visible" id="dd-contest-overlay">' +
        '<div class="dd-civ-new-panel" style="max-width:520px;">' +
          '<div class="dd-civ-new-header">' +
            '<div style="display:flex;align-items:center;gap:0.5rem;"><i class="fa fa-gavel" style="color:var(--dd-amber);"></i><span style="font-weight:600;color:var(--dd-text);">Contest Records</span></div>' +
            '<button class="dd-civ-close" id="dd-contest-close"><i class="fa fa-times"></i></button>' +
          '</div>' +
          '<div style="padding:1.25rem;overflow-y:auto;flex:1;">' +
            '<label class="dd-civ-field" style="margin-bottom:0.75rem;"><span style="font-size:0.75rem;color:var(--dd-text-muted);">Records to Contest (' + items.length + ')</span></label>' +
            itemsHtml +
            '<div class="dd-civ-field" style="margin-top:1rem;">' +
              '<label style="font-size:0.75rem;color:var(--dd-text-muted);display:block;margin-bottom:0.35rem;">Your Statement *</label>' +
              '<textarea id="dd-contest-statement" rows="4" placeholder="Explain why you are contesting these records..." style="width:100%;background:var(--dd-glass);border:1.5px solid var(--dd-glass-border);border-radius:8px;padding:0.6rem 0.75rem;color:var(--dd-text);font-size:0.8125rem;resize:vertical;font-family:inherit;"></textarea>' +
            '</div>' +
            '<div style="display:flex;gap:0.5rem;justify-content:flex-end;margin-top:1rem;">' +
              '<button class="dd-civ-btn dd-civ-btn-secondary dd-civ-btn-small" id="dd-contest-cancel">Cancel</button>' +
              '<button class="dd-civ-btn dd-civ-btn-small" id="dd-contest-submit" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;"><i class="fa fa-gavel" style="margin-right:0.3rem;"></i>Submit Contest</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    $('body').append(html);

    // Store items for submission
    window._ddContestItems = items;

    // Close handlers
    $('#dd-contest-overlay').on('click', function (e) {
      if ($(e.target).is('#dd-contest-overlay')) $('#dd-contest-overlay').remove();
    });
    $('#dd-contest-close, #dd-contest-cancel').on('click', function () {
      $('#dd-contest-overlay').remove();
    });

    // Submit handler
    $('#dd-contest-submit').on('click', function () {
      var statement = $.trim($('#dd-contest-statement').val());
      if (!statement) {
        toast('Please provide a statement explaining why you are contesting.', 'error');
        return;
      }

      var conf = cfg();
      var c = currentCiv;
      var civName = (c.name || '').trim() || ((c.firstName || '') + ' ' + (c.lastName || '')).trim();

      var payload = {
        civilianID: c._id,
        civilianName: civName,
        userID: conf.userId || '',
        contestedItems: window._ddContestItems,
        statement: statement,
        communityID: conf.communityId || '',
        departmentID: ''
      };

      var $btn = $('#dd-contest-submit');
      $btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Submitting...');

      $.ajax({
        url: conf.API_URL + '/api/v2/court-cases',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ courtCase: payload }),
        success: function () {
          $('#dd-contest-overlay').remove();
          toast('Contest submitted — a judge will review your case.', 'success');
          // Re-fetch the civilian to get updated record statuses
          $.ajax({
            url: conf.API_URL + '/api/v1/civilian/' + c._id,
            method: 'GET',
            success: function (updated) {
              var civData = updated.civilian || updated || {};
              civData._id = c._id;
              currentCiv = civData;
              renderRecordsTab($('#dd-civ-d-body'));
            }
          });
        },
        error: function (xhr) {
          var msg = (xhr.responseJSON && xhr.responseJSON.message) || 'Failed to submit contest';
          toast(msg, 'error');
          $btn.prop('disabled', false).html('<i class="fa fa-gavel" style="margin-right:0.3rem;"></i>Submit Contest');
        }
      });
    });
  }

  /* ── Licenses Tab ── */

  var licEditId = null; // Track which license is being edited

  function renderLicensesTab($body) {
    if (!currentCiv) return;
    var c = cfg();
    $body.html('<div class="dd-civ-empty"><i class="fa fa-spinner fa-spin"></i><p>Loading licenses...</p></div>');

    $.ajax({
      url: c.API_URL + '/api/v1/licenses/civilian/' + currentCiv._id,
      method: 'GET',
      success: function (data) {
        var raw = data.data || data.licenses || data || [];
        if (!Array.isArray(raw)) raw = [];
        // API returns { _id, license: { type, status, ... } } — flatten
        var licenses = raw.map(function (item) {
          var lic = item.license || item.details || {};
          lic._id = item._id || item.id || lic._id || '';
          return lic;
        });
        renderLicensesList($body, licenses);
      },
      error: function () {
        $body.html(
          buildLicenseForm(null) +
          '<div class="dd-civ-empty"><i class="fa fa-id-card"></i><p>No licenses found.</p></div>'
        );
        wireLicenseForm($body);
      }
    });
  }

  function renderLicensesList($body, licenses) {
    var html = buildLicenseForm(null);

    if (!licenses.length) {
      html += '<div class="dd-civ-empty"><i class="fa fa-id-card"></i><p>No licenses yet. Add one above.</p></div>';
    } else {
      html += licenses.map(function (lic) {
        var id = lic._id || lic.id || '';
        var statusColors = {
          'Valid': 'var(--dd-green)', 'Approved': 'var(--dd-green)',
          'Suspended': 'var(--dd-amber)', 'Revoked': 'var(--dd-red)',
          'Pending': 'var(--dd-text-muted)'
        };
        var statusColor = statusColors[lic.status] || 'var(--dd-text-muted)';
        return '' +
          '<div class="dd-civ-item-card">' +
            '<i class="fa fa-id-card" style="color:var(--dd-blue);font-size:1rem;margin-top:0.15rem;"></i>' +
            '<div class="dd-civ-item-card-info">' +
              '<div class="dd-civ-item-card-title">' + esc(lic.type || lic.licenseType || 'Unknown License') + '</div>' +
              '<div class="dd-civ-item-card-meta">' +
                'Status: <span style="color:' + statusColor + ';">' + esc(lic.status || 'N/A') + '</span>' +
                (lic.expirationDate ? ' &middot; Expires: ' + fmtDate(lic.expirationDate) : '') +
              '</div>' +
              (lic.notes ? '<div class="dd-civ-item-card-meta" style="margin-top:0.25rem;">' + esc(lic.notes) + '</div>' : '') +
            '</div>' +
            '<div class="dd-civ-item-card-actions">' +
              '<button class="dd-civ-btn dd-civ-btn-secondary dd-civ-btn-small dd-lic-edit" data-lic=\'' + esc(JSON.stringify(lic)) + '\' title="Edit"><i class="fa fa-pen"></i></button>' +
              '<button class="dd-civ-btn dd-civ-btn-danger dd-civ-btn-small dd-lic-delete" data-lic-id="' + esc(id) + '" title="Delete"><i class="fa fa-trash"></i></button>' +
            '</div>' +
          '</div>';
      }).join('');
    }

    $body.html(html);
    wireLicenseForm($body);

    // Edit handlers
    $body.find('.dd-lic-edit').off('click').on('click', function () {
      var lic = JSON.parse($(this).attr('data-lic'));
      licEditId = lic._id || lic.id;
      $body.find('#dd-lic-form-title').text('Edit License');
      $body.find('[name="licType"]').val(lic.type || lic.licenseType || '');
      $body.find('[name="licStatus"]').val(lic.status || '');
      $body.find('[name="licExpiry"]').val(lic.expirationDate ? lic.expirationDate.substring(0, 10) : '');
      $body.find('[name="licNotes"]').val(lic.notes || '');
      $body.find('#dd-lic-form-wrap').show();
      $body.find('#dd-lic-cancel').show();
      // Highlight the card being edited and dim its actions
      $body.find('.dd-civ-item-card').css({ opacity: '', border: '' });
      $(this).closest('.dd-civ-item-card').css({
        opacity: '0.5',
        border: '1.5px solid var(--dd-accent)'
      });
    });

    // Delete handlers
    $body.find('.dd-lic-delete').off('click').on('click', function () {
      var licId = $(this).attr('data-lic-id');
      if (window.ddModal) {
        window.ddModal({
          type: 'danger', icon: 'fa-trash', title: 'Delete License',
          message: 'Are you sure you want to delete this license?',
          confirmText: 'Delete',
          onConfirm: function () { deleteLicense(licId, $body); }
        });
      } else if (confirm('Delete this license?')) {
        deleteLicense(licId, $body);
      }
    });
  }

  function buildLicenseForm(lic) {
    return '' +
      '<div style="margin-bottom:0.75rem;">' +
        '<button class="dd-civ-add-btn" id="dd-lic-toggle-form"><i class="fa fa-plus"></i> Add License</button>' +
      '</div>' +
      '<div class="dd-civ-inline-form" id="dd-lic-form-wrap" style="display:none;">' +
        '<div class="dd-civ-inline-form-title" id="dd-lic-form-title">Add License</div>' +
        '<div class="dd-civ-form-grid">' +
          '<div class="dd-civ-field">' +
            '<label>License Type *</label>' +
            '<input type="text" name="licType" placeholder="e.g. Driver\'s License" />' +
          '</div>' +
          '<div class="dd-civ-field">' +
            '<label>Status</label>' +
            '<select name="licStatus">' +
              '<option value="Pending">Pending</option>' +
              '<option value="Valid">Valid</option>' +
              '<option value="Approved">Approved</option>' +
              '<option value="Suspended">Suspended</option>' +
              '<option value="Revoked">Revoked</option>' +
            '</select>' +
          '</div>' +
          '<div class="dd-civ-field">' +
            '<label>Expiry Date</label>' +
            '<input type="date" name="licExpiry" />' +
          '</div>' +
          '<div class="dd-civ-field dd-civ-form-full">' +
            '<label>Notes</label>' +
            '<textarea name="licNotes" rows="2" placeholder="Optional notes..."></textarea>' +
          '</div>' +
          '<div class="dd-civ-form-full" style="display:flex;gap:0.5rem;justify-content:flex-end;">' +
            '<button type="button" class="dd-civ-btn dd-civ-btn-secondary dd-civ-btn-small" id="dd-lic-cancel" style="display:none;">Cancel</button>' +
            '<button type="button" class="dd-civ-btn dd-civ-btn-primary dd-civ-btn-small" id="dd-lic-save"><i class="fa fa-save" style="margin-right:0.3rem;"></i>Save</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function wireLicenseForm($body) {
    $body.find('#dd-lic-toggle-form').off('click').on('click', function () {
      licEditId = null;
      $body.find('#dd-lic-form-title').text('Add License');
      $body.find('#dd-lic-form-wrap input, #dd-lic-form-wrap textarea').val('');
      $body.find('[name="licStatus"]').val('Pending');
      $body.find('#dd-lic-cancel').hide();
      $body.find('#dd-lic-form-wrap').toggle();
    });

    $body.find('#dd-lic-cancel').off('click').on('click', function () {
      licEditId = null;
      $body.find('#dd-lic-form-wrap').hide();
      $body.find('.dd-civ-item-card').css({ opacity: '', border: '' });
    });

    $body.find('#dd-lic-save').off('click').on('click', function () {
      var c = cfg();
      var type = $.trim($body.find('[name="licType"]').val());
      if (!type) { toast('License type is required', 'error'); return; }

      var payload = {
        type: type,
        status: $body.find('[name="licStatus"]').val(),
        expirationDate: $body.find('[name="licExpiry"]').val() || '',
        notes: $body.find('[name="licNotes"]').val(),
        civilianID: currentCiv._id
      };

      if (licEditId) {
        $.ajax({
          url: c.API_URL + '/api/v1/license/' + licEditId,
          method: 'PUT',
          contentType: 'application/json',
          data: JSON.stringify(payload),
          success: function () {
            toast('License updated', 'success');
            licEditId = null;
            renderLicensesTab($body);
          },
          error: function () { toast('Failed to update license', 'error'); }
        });
      } else {
        $.ajax({
          url: c.API_URL + '/api/v1/license',
          method: 'POST',
          contentType: 'application/json',
          data: JSON.stringify(payload),
          success: function () {
            toast('License created', 'success');
            renderLicensesTab($body);
          },
          error: function () { toast('Failed to create license', 'error'); }
        });
      }
    });
  }

  function deleteLicense(licId, $body) {
    var c = cfg();
    $.ajax({
      url: c.API_URL + '/api/v1/license/' + licId,
      method: 'DELETE',
      success: function () {
        toast('License deleted', 'success');
        renderLicensesTab($body);
      },
      error: function () { toast('Failed to delete license', 'error'); }
    });
  }

  /* ── Medical Tab (Medications + Medical Reports sub-tabs) ── */

  var medEditId = null;
  var cachedMedications = [];
  var cachedMedicalReports = [];
  var activeMedSubTab = 'medications'; // 'medications' | 'reports'

  function renderMedicalTab($body) {
    if (!currentCiv) return;
    var c = cfg();
    $body.html('<div class="dd-civ-empty"><i class="fa fa-spinner fa-spin"></i><p>Loading medical data...</p></div>');

    var loaded = 0;
    function checkDone() {
      loaded++;
      if (loaded >= 2) renderMedicalShell($body);
    }

    // Fetch medications
    $.ajax({
      url: c.API_URL + '/api/v1/medications?civilian_id=' + currentCiv._id + '&active_community_id=' + encodeURIComponent(c.communityId),
      method: 'GET',
      success: function (data) {
        cachedMedications = (data.medications || []).map(function (m) { return m.medication || m; });
        checkDone();
      },
      error: function () { cachedMedications = []; checkDone(); }
    });

    // Fetch medical reports
    $.ajax({
      url: c.API_URL + '/api/v1/medical-reports?civilian_id=' + currentCiv._id + '&active_community_id=' + encodeURIComponent(c.communityId),
      method: 'GET',
      success: function (data) {
        cachedMedicalReports = data.medicalReports || [];
        checkDone();
      },
      error: function () { cachedMedicalReports = []; checkDone(); }
    });
  }

  function renderMedicalShell($body) {
    var medCount = cachedMedications.length;
    var repCount = cachedMedicalReports.length;
    var isRep = activeMedSubTab === 'reports';

    var html = '' +
      // Sub-tab toggle
      '<div style="display:flex;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap;">' +
        '<button class="dd-med-subtab' + (!isRep ? ' dd-med-subtab-active' : '') + '" data-subtab="medications">' +
          '<i class="fa fa-pills" style="margin-right:0.35rem;"></i>Medications' +
          '<span class="dd-med-subtab-badge">' + medCount + '</span>' +
        '</button>' +
        '<button class="dd-med-subtab' + (isRep ? ' dd-med-subtab-active' : '') + '" data-subtab="reports">' +
          '<i class="fa fa-file-medical" style="margin-right:0.35rem;"></i>Medical Reports' +
          '<span class="dd-med-subtab-badge">' + repCount + '</span>' +
        '</button>' +
      '</div>' +
      '<div id="dd-med-content"></div>';

    $body.html(html);

    // Sub-tab click handlers
    $body.find('.dd-med-subtab').off('click').on('click', function () {
      activeMedSubTab = $(this).data('subtab');
      $body.find('.dd-med-subtab').removeClass('dd-med-subtab-active');
      $(this).addClass('dd-med-subtab-active');
      renderMedSubContent($body);
    });

    renderMedSubContent($body);
  }

  function renderMedSubContent($body) {
    var $content = $body.find('#dd-med-content');
    if (activeMedSubTab === 'medications') {
      renderMedicationsList($content, $body);
    } else {
      renderReportsList($content, $body);
    }
  }

  /* ── Medications Sub-Tab ── */

  function renderMedicationsList($content, $body) {
    var html = '' +
      '<div style="margin-bottom:0.75rem;">' +
        '<button class="dd-civ-add-btn" id="dd-medx-toggle-form"><i class="fa fa-plus"></i> Add Medication</button>' +
      '</div>' +
      '<div class="dd-civ-inline-form" id="dd-medx-form-wrap" style="display:none;">' +
        '<div class="dd-civ-inline-form-title" id="dd-medx-form-title">Add Medication</div>' +
        '<div class="dd-civ-form-grid">' +
          '<div class="dd-civ-field">' +
            '<label>Medication Name *</label>' +
            '<input type="text" name="medxName" placeholder="e.g. Ibuprofen" />' +
          '</div>' +
          '<div class="dd-civ-field">' +
            '<label>Dosage</label>' +
            '<input type="text" name="medxDosage" placeholder="e.g. 200mg" />' +
          '</div>' +
          '<div class="dd-civ-field">' +
            '<label>Frequency</label>' +
            '<input type="text" name="medxFrequency" placeholder="e.g. Twice daily" />' +
          '</div>' +
          '<div class="dd-civ-field">' +
            '<label>Start Date</label>' +
            '<input type="date" name="medxStartDate" />' +
          '</div>' +
          '<div class="dd-civ-form-full" style="display:flex;gap:0.5rem;justify-content:flex-end;">' +
            '<button type="button" class="dd-civ-btn dd-civ-btn-primary dd-civ-btn-small" id="dd-medx-save"><i class="fa fa-save" style="margin-right:0.3rem;"></i>Save</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    if (!cachedMedications.length) {
      html += '<div class="dd-civ-empty"><i class="fa fa-pills"></i><p>No medications yet. Add one above.</p></div>';
    } else {
      html += cachedMedications.map(function (m) {
        var id = m._id || m.id || '';
        return '' +
          '<div class="dd-civ-item-card">' +
            '<i class="fa fa-pills" style="color:var(--dd-green);font-size:1rem;margin-top:0.15rem;"></i>' +
            '<div class="dd-civ-item-card-info">' +
              '<div class="dd-civ-item-card-title">' + esc(m.name || 'Medication') + '</div>' +
              '<div class="dd-civ-item-card-meta">' +
                (m.dosage ? esc(m.dosage) : '') +
                (m.dosage && m.frequency ? ' &middot; ' : '') +
                (m.frequency ? esc(m.frequency) : '') +
              '</div>' +
              (m.startDate ? '<div class="dd-civ-item-card-meta" style="margin-top:0.15rem;">' + fmtDate(m.startDate) + '</div>' : '') +
            '</div>' +
            '<div class="dd-civ-item-card-actions">' +
              '<button class="dd-civ-btn dd-civ-btn-secondary dd-civ-btn-small dd-medx-edit" data-medx=\'' + esc(JSON.stringify(m)) + '\' data-medx-id="' + esc(id) + '" title="Edit"><i class="fa fa-pen"></i></button>' +
              '<button class="dd-civ-btn dd-civ-btn-danger dd-civ-btn-small dd-medx-delete" data-medx-id="' + esc(id) + '" title="Delete"><i class="fa fa-trash"></i></button>' +
            '</div>' +
          '</div>';
      }).join('');
    }

    $content.html(html);
    wireMedicationForm($content, $body);
  }

  function wireMedicationForm($content, $body) {
    // Toggle add form
    $content.find('#dd-medx-toggle-form').off('click').on('click', function () {
      medEditId = null;
      $content.find('.dd-medx-inline-edit').remove();
      $content.find('#dd-medx-form-title').text('Add Medication');
      $content.find('#dd-medx-form-wrap input').val('');
      $content.find('#dd-medx-form-wrap').toggle();
    });

    // Save (add new)
    $content.find('#dd-medx-save').off('click').on('click', function () {
      var c = cfg();
      var name = $.trim($content.find('#dd-medx-form-wrap [name="medxName"]').val());
      if (!name) { toast('Medication name is required', 'error'); return; }

      var payload = {
        medication: {
          name: name,
          dosage: $content.find('#dd-medx-form-wrap [name="medxDosage"]').val() || '',
          frequency: $content.find('#dd-medx-form-wrap [name="medxFrequency"]').val() || '',
          startDate: $content.find('#dd-medx-form-wrap [name="medxStartDate"]').val() || '',
          civilianID: currentCiv._id,
          activeCommunityID: c.communityId
        }
      };

      $.ajax({
        url: c.API_URL + '/api/v1/medications',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload),
        success: function () { toast('Medication added', 'success'); renderMedicalTab($body); },
        error: function () { toast('Failed to add medication', 'error'); }
      });
    });

    // Edit handlers — inline below card
    $content.find('.dd-medx-edit').off('click').on('click', function () {
      var m = JSON.parse($(this).attr('data-medx'));
      var $card = $(this).closest('.dd-civ-item-card');

      $content.find('.dd-medx-inline-edit').remove();
      $content.find('#dd-medx-form-wrap').hide();
      medEditId = m._id || m.id;

      var $ef = $('' +
        '<div class="dd-civ-inline-form dd-medx-inline-edit" style="margin:0.25rem 0 0.75rem;border-left:3px solid var(--dd-accent, #7c3aed);">' +
          '<div class="dd-civ-inline-form-title">Edit Medication</div>' +
          '<div class="dd-civ-form-grid">' +
            '<div class="dd-civ-field"><label>Medication Name *</label><input type="text" name="medxName" /></div>' +
            '<div class="dd-civ-field"><label>Dosage</label><input type="text" name="medxDosage" /></div>' +
            '<div class="dd-civ-field"><label>Frequency</label><input type="text" name="medxFrequency" /></div>' +
            '<div class="dd-civ-field"><label>Start Date</label><input type="date" name="medxStartDate" /></div>' +
            '<div class="dd-civ-form-full" style="display:flex;gap:0.5rem;justify-content:flex-end;">' +
              '<button type="button" class="dd-civ-btn dd-civ-btn-secondary dd-civ-btn-small dd-medx-inline-cancel">Cancel</button>' +
              '<button type="button" class="dd-civ-btn dd-civ-btn-primary dd-civ-btn-small dd-medx-inline-save"><i class="fa fa-save" style="margin-right:0.3rem;"></i>Save</button>' +
            '</div>' +
          '</div>' +
        '</div>');

      $ef.find('[name="medxName"]').val(m.name || '');
      $ef.find('[name="medxDosage"]').val(m.dosage || '');
      $ef.find('[name="medxFrequency"]').val(m.frequency || '');
      $ef.find('[name="medxStartDate"]').val(toDateInputVal(m.startDate || ''));
      $card.after($ef);

      $ef.find('.dd-medx-inline-cancel').on('click', function () { medEditId = null; $ef.remove(); });
      $ef.find('.dd-medx-inline-save').on('click', function () {
        var c = cfg();
        var n = $.trim($ef.find('[name="medxName"]').val());
        if (!n) { toast('Medication name is required', 'error'); return; }
        $.ajax({
          url: c.API_URL + '/api/v1/medications/' + medEditId,
          method: 'PUT',
          contentType: 'application/json',
          data: JSON.stringify({
            medication: {
              name: n,
              dosage: $ef.find('[name="medxDosage"]').val() || '',
              frequency: $ef.find('[name="medxFrequency"]').val() || '',
              startDate: $ef.find('[name="medxStartDate"]').val() || '',
              civilianID: currentCiv._id,
              activeCommunityID: c.communityId
            }
          }),
          success: function () { toast('Medication updated', 'success'); medEditId = null; renderMedicalTab($body); },
          error: function () { toast('Failed to update medication', 'error'); }
        });
      });

      setTimeout(function () { $ef[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 50);
    });

    // Delete handlers
    $content.find('.dd-medx-delete').off('click').on('click', function () {
      var id = $(this).attr('data-medx-id');
      if (window.ddModal) {
        window.ddModal({
          type: 'danger', icon: 'fa-trash', title: 'Delete Medication',
          message: 'Are you sure you want to delete this medication?',
          confirmText: 'Delete',
          onConfirm: function () { deleteMedication(id, $body); }
        });
      } else if (confirm('Delete this medication?')) {
        deleteMedication(id, $body);
      }
    });
  }

  function deleteMedication(id, $body) {
    var c = cfg();
    $.ajax({
      url: c.API_URL + '/api/v1/medications/' + id,
      method: 'DELETE',
      success: function () { toast('Medication deleted', 'success'); renderMedicalTab($body); },
      error: function () { toast('Failed to delete medication', 'error'); }
    });
  }

  /* ── Medical Reports Sub-Tab ── */

  function renderReportsList($content, $body) {
    var html = '' +
      '<div style="margin-bottom:0.75rem;">' +
        '<button class="dd-civ-add-btn" id="dd-rep-toggle-form"><i class="fa fa-plus"></i> Add Medical Report</button>' +
      '</div>' +
      '<div class="dd-civ-inline-form" id="dd-rep-form-wrap" style="display:none;">' +
        '<div class="dd-civ-inline-form-title">Add Medical Report</div>' +
        '<div class="dd-civ-form-grid">' +
          '<div class="dd-civ-field">' +
            '<label>Report Date *</label>' +
            '<input type="date" name="repDate" />' +
          '</div>' +
          '<div class="dd-civ-field">' +
            '<label>Report Time</label>' +
            '<input type="time" name="repTime" />' +
          '</div>' +
          '<div class="dd-civ-field">' +
            '<label>Hospitalized</label>' +
            '<select name="repHospitalized"><option value="no">No</option><option value="yes">Yes</option></select>' +
          '</div>' +
          '<div class="dd-civ-field">' +
            '<label>Deceased</label>' +
            '<select name="repDeceased"><option value="false">No</option><option value="true">Yes</option></select>' +
          '</div>' +
          '<div class="dd-civ-field dd-civ-form-full">' +
            '<label>Details</label>' +
            '<textarea name="repDetails" rows="2" placeholder="Details of medical report..."></textarea>' +
          '</div>' +
          '<div class="dd-civ-form-full" style="display:flex;gap:0.5rem;justify-content:flex-end;">' +
            '<button type="button" class="dd-civ-btn dd-civ-btn-primary dd-civ-btn-small" id="dd-rep-save"><i class="fa fa-save" style="margin-right:0.3rem;"></i>Save</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    if (!cachedMedicalReports.length) {
      html += '<div class="dd-civ-empty"><i class="fa fa-file-medical"></i><p>No medical reports yet. Add one above.</p></div>';
    } else {
      html += cachedMedicalReports.map(function (r) {
        var id = r._id || r.id || '';
        var dateStr = r.date || r.reportDate || '';
        var hospitalized = r.hospitalized;
        if (typeof hospitalized === 'boolean') hospitalized = hospitalized ? 'yes' : 'no';
        return '' +
          '<div class="dd-civ-item-card">' +
            '<i class="fa fa-file-medical" style="color:var(--dd-amber, #f59e0b);font-size:1rem;margin-top:0.15rem;"></i>' +
            '<div class="dd-civ-item-card-info">' +
              '<div class="dd-civ-item-card-title">' + (dateStr ? fmtDate(dateStr) : r.createdAt ? fmtDate(r.createdAt) : 'Medical Report') + (r.reportTime ? ' ' + esc(r.reportTime) : '') + '</div>' +
              '<div class="dd-civ-item-card-meta">' +
                'Hospitalized: ' + esc(hospitalized || 'no') +
                (r.deceased === true || r.deceased === 'true' ? ' &middot; <span style="color:#ef4444;">Deceased</span>' : '') +
                (r.reportingEms && r.reportingEms.name ? ' &middot; ' + esc(r.reportingEms.name) : '') +
              '</div>' +
              (r.details ? '<div class="dd-civ-item-card-meta" style="margin-top:0.15rem;">' + esc(r.details) + '</div>' : '') +
            '</div>' +
            '<div class="dd-civ-item-card-actions">' +
              '<button class="dd-civ-btn dd-civ-btn-secondary dd-civ-btn-small dd-rep-edit" data-rep=\'' + esc(JSON.stringify(r)) + '\' title="Edit"><i class="fa fa-pen"></i></button>' +
              '<button class="dd-civ-btn dd-civ-btn-danger dd-civ-btn-small dd-rep-delete" data-rep-id="' + esc(id) + '" title="Delete"><i class="fa fa-trash"></i></button>' +
            '</div>' +
          '</div>';
      }).join('');
    }

    $content.html(html);
    wireReportForm($content, $body);
  }

  function wireReportForm($content, $body) {
    // Toggle add form
    $content.find('#dd-rep-toggle-form').off('click').on('click', function () {
      medEditId = null;
      $content.find('.dd-rep-inline-edit').remove();
      $content.find('#dd-rep-form-wrap input, #dd-rep-form-wrap textarea').val('');
      $content.find('#dd-rep-form-wrap select').prop('selectedIndex', 0);
      $content.find('#dd-rep-form-wrap').toggle();
    });

    // Save (add new)
    $content.find('#dd-rep-save').off('click').on('click', function () {
      var c = cfg();
      var date = $content.find('#dd-rep-form-wrap [name="repDate"]').val();
      if (!date) { toast('Date is required', 'error'); return; }

      var timeVal = $content.find('#dd-rep-form-wrap [name="repTime"]').val() || '';
      var fullDate = timeVal ? date + 'T' + timeVal + ':00' : date;
      var payload = {
        report: {
          date: fullDate,
          details: $content.find('#dd-rep-form-wrap [name="repDetails"]').val() || '',
          hospitalized: $content.find('#dd-rep-form-wrap [name="repHospitalized"]').val() === 'yes',
          deceased: $content.find('#dd-rep-form-wrap [name="repDeceased"]').val() === 'true',
          civilianID: currentCiv._id,
          activeCommunityID: c.communityId,
          name: (currentCiv.firstName || '') + ' ' + (currentCiv.lastName || '')
        }
      };

      $.ajax({
        url: c.API_URL + '/api/v1/medical-reports',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload),
        success: function () { toast('Medical report created', 'success'); renderMedicalTab($body); },
        error: function () { toast('Failed to create report', 'error'); }
      });
    });

    // Edit handlers — inline below card
    $content.find('.dd-rep-edit').off('click').on('click', function () {
      var r = JSON.parse($(this).attr('data-rep'));
      var $card = $(this).closest('.dd-civ-item-card');

      $content.find('.dd-rep-inline-edit').remove();
      $content.find('#dd-rep-form-wrap').hide();
      medEditId = r._id || r.id;

      var hospitalized = r.hospitalized;
      if (typeof hospitalized === 'boolean') hospitalized = hospitalized ? 'yes' : 'no';

      var $ef = $('' +
        '<div class="dd-civ-inline-form dd-rep-inline-edit" style="margin:0.25rem 0 0.75rem;border-left:3px solid var(--dd-accent, #7c3aed);">' +
          '<div class="dd-civ-inline-form-title">Edit Medical Report</div>' +
          '<div class="dd-civ-form-grid">' +
            '<div class="dd-civ-field"><label>Report Date *</label><input type="date" name="repDate" /></div>' +
            '<div class="dd-civ-field"><label>Report Time</label><input type="time" name="repTime" /></div>' +
            '<div class="dd-civ-field"><label>Hospitalized</label>' +
              '<select name="repHospitalized"><option value="no">No</option><option value="yes">Yes</option></select></div>' +
            '<div class="dd-civ-field"><label>Deceased</label>' +
              '<select name="repDeceased"><option value="false">No</option><option value="true">Yes</option></select></div>' +
            '<div class="dd-civ-field dd-civ-form-full"><label>Details</label>' +
              '<textarea name="repDetails" rows="2" placeholder="Details of medical report..."></textarea></div>' +
            '<div class="dd-civ-form-full" style="display:flex;gap:0.5rem;justify-content:flex-end;">' +
              '<button type="button" class="dd-civ-btn dd-civ-btn-secondary dd-civ-btn-small dd-rep-inline-cancel">Cancel</button>' +
              '<button type="button" class="dd-civ-btn dd-civ-btn-primary dd-civ-btn-small dd-rep-inline-save"><i class="fa fa-save" style="margin-right:0.3rem;"></i>Save</button>' +
            '</div>' +
          '</div>' +
        '</div>');

      $ef.find('[name="repDate"]').val(toDateInputVal(r.date || r.reportDate || ''));
      $ef.find('[name="repTime"]').val(r.reportTime || '');
      $ef.find('[name="repHospitalized"]').val(hospitalized || 'no');
      $ef.find('[name="repDeceased"]').val(r.deceased === true || r.deceased === 'true' ? 'true' : 'false');
      $ef.find('[name="repDetails"]').val(r.details || '');
      $card.after($ef);

      $ef.find('.dd-rep-inline-cancel').on('click', function () { medEditId = null; $ef.remove(); });
      $ef.find('.dd-rep-inline-save').on('click', function () {
        var c = cfg();
        var d = $ef.find('[name="repDate"]').val();
        if (!d) { toast('Date is required', 'error'); return; }
        var t = $ef.find('[name="repTime"]').val() || '';
        var fullD = t ? d + 'T' + t + ':00' : d;
        $.ajax({
          url: c.API_URL + '/api/v1/medical-reports/' + medEditId,
          method: 'PUT',
          contentType: 'application/json',
          data: JSON.stringify({
            report: {
              date: fullD,
              details: $ef.find('[name="repDetails"]').val() || '',
              hospitalized: $ef.find('[name="repHospitalized"]').val() === 'yes',
              deceased: $ef.find('[name="repDeceased"]').val() === 'true',
              civilianID: currentCiv._id,
              activeCommunityID: c.communityId,
              name: (currentCiv.firstName || '') + ' ' + (currentCiv.lastName || '')
            }
          }),
          success: function () { toast('Medical report updated', 'success'); medEditId = null; renderMedicalTab($body); },
          error: function () { toast('Failed to update report', 'error'); }
        });
      });

      setTimeout(function () { $ef[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 50);
    });

    // Delete handlers
    $content.find('.dd-rep-delete').off('click').on('click', function () {
      var id = $(this).attr('data-rep-id');
      if (window.ddModal) {
        window.ddModal({
          type: 'danger', icon: 'fa-trash', title: 'Delete Medical Report',
          message: 'Are you sure you want to delete this medical report?',
          confirmText: 'Delete',
          onConfirm: function () { deleteReport(id, $body); }
        });
      } else if (confirm('Delete this report?')) {
        deleteReport(id, $body);
      }
    });
  }

  function deleteReport(id, $body) {
    var c = cfg();
    $.ajax({
      url: c.API_URL + '/api/v1/medical-reports/' + id,
      method: 'DELETE',
      success: function () { toast('Medical report deleted', 'success'); renderMedicalTab($body); },
      error: function () { toast('Failed to delete report', 'error'); }
    });
  }

  /* ── Placeholder Tab ── */

  function renderPlaceholderTab($body, title, icon, message) {
    $body.html(
      '<div class="dd-civ-placeholder">' +
        '<i class="fa ' + icon + '"></i>' +
        '<p>' + esc(message) + '</p>' +
      '</div>'
    );
  }

  /* ───────────────────────────────────────────
     Delete Civilian
     ─────────────────────────────────────────── */

  function deleteCivilian(civId) {
    if (!window.ddModal) {
      if (!confirm('Are you sure you want to delete this civilian? This cannot be undone.')) return;
      doDelete(civId);
      return;
    }

    window.ddModal({
      type: 'danger',
      icon: 'fa-trash',
      title: 'Delete Civilian',
      message: 'Are you sure you want to delete this civilian?',
      detail: 'This action cannot be undone.',
      confirmText: 'Delete',
      onConfirm: function () { doDelete(civId); }
    });
  }

  function doDelete(civId) {
    var c = cfg();
    $.ajax({
      url: c.API_URL + '/api/v1/civilian/' + civId,
      method: 'DELETE',
      headers: {},
      success: function () {
        toast('Civilian deleted', 'success');
        closeDetailModal();
        if (ddCivSearchTerm) {
          searchCivilians(ddCivSearchTerm);
        } else {
          loadCivilians();
        }
        if (window.ddLimits) window.ddLimits.check('civilian');
      },
      error: function () {
        toast('Failed to delete civilian', 'error');
      }
    });
  }

  /* ───────────────────────────────────────────
     Send for Approval
     ─────────────────────────────────────────── */

  function sendForApproval(civId) {
    var c = cfg();
    $.ajax({
      url: c.API_URL + '/api/v1/civilian/approval',
      method: 'POST',
      headers: {},
      contentType: 'application/json',
      data: JSON.stringify({
        civilianId: civId,
        communityId: c.communityId,
        userId: c.userId,
        action: 'send_for_approval'
      }),
      success: function () {
        toast('Sent for approval', 'success');
        // Update local state
        if (currentCiv) currentCiv.approvalStatus = 'requested_review';
        // Refresh badge in actions bar
        var badge = approvalBadge('requested_review');
        $('#dd-civ-d-actions .dd-civ-badge').attr('class', 'dd-civ-badge ' + badge.cls).text(badge.label);
        // Refresh list
        if (ddCivSearchTerm) {
          searchCivilians(ddCivSearchTerm);
        } else {
          loadCivilians();
        }
      },
      error: function () {
        toast('Failed to send for approval', 'error');
      }
    });
  }

  /* ───────────────────────────────────────────
     New Civilian Modal
     ─────────────────────────────────────────── */

  var $newOverlay = null;

  function ensureNewModal() {
    if ($newOverlay) return;

    var genderOpts = '<option value="Other">Other</option><option value="Male">Male</option><option value="Female">Female</option><option value="Non-Binary">Non-Binary</option>';

    var html = '' +
      '<div class="dd-civ-new-overlay" id="dd-civ-new-overlay">' +
        '<div class="dd-civ-new-panel">' +
          '<div class="dd-civ-new-header">' +
            '<span class="dd-civ-new-title"><i class="fa fa-user-plus" style="margin-right:0.4rem;color:var(--dd-accent);"></i>Add a New Civilian</span>' +
            '<button class="dd-civ-close" id="dd-civ-new-close"><i class="fa fa-times"></i></button>' +
          '</div>' +
          '<div class="dd-civ-new-body">' +
            '<form id="dd-civ-new-form" class="dd-civ-form-grid">' +

              /* ── Profile Photo ── */
              '<div class="dd-civ-form-full" style="display:flex;align-items:center;gap:1rem;margin-bottom:0.5rem;">' +
                '<div class="dd-civ-photo-upload" id="dd-civ-new-photo-wrap" style="flex-shrink:0;">' +
                  '<div style="width:64px;height:64px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;background:var(--dd-glass);border:1.5px solid var(--dd-glass-border);" id="dd-civ-new-photo-preview">' +
                    '<i class="fa fa-user" style="font-size:1.5rem;color:var(--dd-text-muted);"></i>' +
                  '</div>' +
                  '<div class="dd-civ-photo-overlay"><i class="fa fa-camera"></i></div>' +
                  '<input type="file" accept="image/*" id="dd-civ-new-photo-input" />' +
                '</div>' +
                '<div>' +
                  '<button type="button" class="dd-civ-btn dd-civ-btn-primary dd-civ-btn-small" id="dd-civ-new-photo-btn"><i class="fa fa-camera" style="margin-right:0.3rem;"></i>Choose Photo</button>' +
                  '<div id="dd-civ-new-photo-status" style="font-size:0.7rem;color:var(--dd-text-muted);margin-top:0.25rem;"></div>' +
                '</div>' +
              '</div>' +
              '<input type="hidden" name="image" id="dd-civ-new-photo-url" value="" />' +

              /* ── Basic Details ── */
              '<div class="dd-civ-section-label"><i class="fa fa-user" style="margin-right:0.3rem;"></i> Basic Details</div>' +

              '<div class="dd-civ-field dd-civ-form-full">' +
                '<label>Civilian Name *</label>' +
                '<input type="text" name="name" required placeholder="Enter full name" />' +
              '</div>' +
              '<div class="dd-civ-field dd-civ-form-full">' +
                '<label>Date of Birth *</label>' +
                '<input type="date" name="birthday" required />' +
              '</div>' +
              '<div class="dd-civ-field dd-civ-form-full">' +
                '<label>Address</label>' +
                '<input type="text" name="address" placeholder="Address (optional)" />' +
              '</div>' +
              '<div class="dd-civ-field dd-civ-form-full">' +
                '<label>Occupation</label>' +
                '<input type="text" name="occupation" placeholder="Job/occupation (optional)" />' +
              '</div>' +

              /* ── Additional Details ── */
              '<div class="dd-civ-section-label"><i class="fa fa-user-cog" style="margin-right:0.3rem;"></i> Additional Details</div>' +

              '<div class="dd-civ-field dd-civ-form-full">' +
                '<label>Gender</label>' +
                '<select name="gender">' + genderOpts + '</select>' +
              '</div>' +

              /* ── Height ── */
              '<div class="dd-civ-field dd-civ-form-full">' +
                '<label>Height</label>' +
                '<div class="dd-civ-toggle-wrap">' +
                  '<button type="button" class="dd-civ-toggle-btn dd-civ-height-toggle active" data-value="imperial">Imperial (ft/in)</button>' +
                  '<button type="button" class="dd-civ-toggle-btn dd-civ-height-toggle" data-value="metric">Metric (cm)</button>' +
                '</div>' +
                '<div class="dd-civ-height-imperial" style="display:flex;gap:0.5rem;">' +
                  '<input type="number" name="heightFoot" min="0" max="15" placeholder="ft" style="width:80px;" />' +
                  '<input type="number" name="heightInches" min="0" max="12" placeholder="in" style="width:80px;" />' +
                '</div>' +
                '<div class="dd-civ-height-metric" style="display:none;">' +
                  '<input type="number" name="heightCm" min="0" max="457" placeholder="cm" style="width:140px;" />' +
                '</div>' +
              '</div>' +

              /* ── Weight ── */
              '<div class="dd-civ-field dd-civ-form-full">' +
                '<label>Weight</label>' +
                '<div class="dd-civ-toggle-wrap">' +
                  '<button type="button" class="dd-civ-toggle-btn dd-civ-weight-toggle active" data-value="imperial">lbs</button>' +
                  '<button type="button" class="dd-civ-toggle-btn dd-civ-weight-toggle" data-value="metric">kg</button>' +
                '</div>' +
                '<div class="dd-civ-weight-imperial">' +
                  '<input type="number" name="weightLbs" min="0" max="1000" placeholder="lbs" style="width:140px;" />' +
                '</div>' +
                '<div class="dd-civ-weight-metric" style="display:none;">' +
                  '<input type="number" name="weightKg" min="0" max="453" placeholder="kg" style="width:140px;" />' +
                '</div>' +
              '</div>' +

              /* ── Eye Color, Hair Color ── */
              '<div class="dd-civ-field dd-civ-form-full">' +
                '<label>Eye Color</label>' +
                '<input type="text" name="eyeColor" placeholder="Eye color (optional)" />' +
              '</div>' +
              '<div class="dd-civ-field dd-civ-form-full">' +
                '<label>Hair Color</label>' +
                '<input type="text" name="hairColor" placeholder="Hair color (optional)" />' +
              '</div>' +

              /* ── Checkboxes ── */
              '<div class="dd-civ-checkbox-row" style="flex-direction:column;gap:0.5rem;">' +
                '<label class="dd-civ-checkbox"><input type="checkbox" name="organDonor" /> Organ Donor</label>' +
                '<label class="dd-civ-checkbox"><input type="checkbox" name="veteran" /> Veteran</label>' +
                '<label class="dd-civ-checkbox"><input type="checkbox" name="onParole" /> On Parole</label>' +
                '<label class="dd-civ-checkbox"><input type="checkbox" name="onProbation" /> On Probation</label>' +
              '</div>' +
            '</form>' +
          '</div>' +
          '<div class="dd-civ-new-footer">' +
            '<button class="dd-civ-btn dd-civ-btn-secondary" id="dd-civ-new-cancel">Cancel</button>' +
            '<button class="dd-civ-btn dd-civ-btn-primary" id="dd-civ-new-submit"><i class="fa fa-plus" style="margin-right:0.3rem;"></i>Create Civilian</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    $('body').append(html);
    $newOverlay = $('#dd-civ-new-overlay');

    // Close handlers
    $newOverlay.on('click', function (e) {
      if ($(e.target).is($newOverlay)) closeNewModal();
    });
    $newOverlay.on('click', '#dd-civ-new-close, #dd-civ-new-cancel', function () {
      closeNewModal();
    });

    // Submit
    $newOverlay.on('click', '#dd-civ-new-submit', function () {
      submitNewCivilian();
    });
    $newOverlay.find('#dd-civ-new-form').on('submit', function (e) {
      e.preventDefault();
      submitNewCivilian();
    });

    // Height toggle
    $newOverlay.on('click', '.dd-civ-height-toggle', function () {
      $newOverlay.find('.dd-civ-height-toggle').removeClass('active');
      $(this).addClass('active');
      var val = $(this).data('value');
      $newOverlay.find('.dd-civ-height-imperial').toggle(val === 'imperial');
      $newOverlay.find('.dd-civ-height-metric').toggle(val === 'metric');
    });

    // Weight toggle
    $newOverlay.on('click', '.dd-civ-weight-toggle', function () {
      $newOverlay.find('.dd-civ-weight-toggle').removeClass('active');
      $(this).addClass('active');
      var val = $(this).data('value');
      $newOverlay.find('.dd-civ-weight-imperial').toggle(val === 'imperial');
      $newOverlay.find('.dd-civ-weight-metric').toggle(val === 'metric');
    });

    // Photo upload for new civilian — stop file input click from bubbling
    $newOverlay.on('click', '#dd-civ-new-photo-input', function (e) {
      e.stopPropagation();
    });
    $newOverlay.on('click', '#dd-civ-new-photo-wrap, #dd-civ-new-photo-btn', function () {
      $newOverlay.find('#dd-civ-new-photo-input')[0].click();
    });
    $newOverlay.on('change', '#dd-civ-new-photo-input', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!window.uploadToCloudinary) {
        toast('Photo upload not configured', 'error');
        return;
      }
      var $preview = $newOverlay.find('#dd-civ-new-photo-preview');
      var $status = $newOverlay.find('#dd-civ-new-photo-status');
      $preview.html('<i class="fa fa-spinner fa-spin" style="color:var(--dd-text-muted);"></i>');
      $status.text('Uploading...');
      window.uploadToCloudinary(file, 'civilians', null)
        .then(function (url) {
          $preview.html('<img src="' + esc(url) + '" alt="" style="width:100%;height:100%;object-fit:cover;" />');
          $newOverlay.find('#dd-civ-new-photo-url').val(url);
          $status.text('Photo uploaded');
          toast('Photo uploaded', 'success');
        })
        .catch(function () {
          $preview.html('<i class="fa fa-user" style="font-size:1.5rem;color:var(--dd-text-muted);"></i>');
          $status.text('Upload failed');
          toast('Photo upload failed', 'error');
        });
    });
  }

  function openNewCivilianModal() {
    ensureNewModal();
    // Reset form
    $newOverlay.find('#dd-civ-new-form')[0].reset();
    // Reset photo preview
    $newOverlay.find('#dd-civ-new-photo-preview').html('<i class="fa fa-user" style="font-size:1.5rem;color:var(--dd-text-muted);"></i>');
    $newOverlay.find('#dd-civ-new-photo-url').val('');
    $newOverlay.find('#dd-civ-new-photo-status').text('');
    // Reset toggles to imperial defaults
    $newOverlay.find('.dd-civ-height-toggle').removeClass('active').filter('[data-value="imperial"]').addClass('active');
    $newOverlay.find('.dd-civ-height-imperial').show();
    $newOverlay.find('.dd-civ-height-metric').hide();
    $newOverlay.find('.dd-civ-weight-toggle').removeClass('active').filter('[data-value="imperial"]').addClass('active');
    $newOverlay.find('.dd-civ-weight-imperial').show();
    $newOverlay.find('.dd-civ-weight-metric').hide();
    $newOverlay.addClass('dd-civ-visible');
    $('body').css('overflow', 'hidden');
  }

  function closeNewModal() {
    if ($newOverlay) $newOverlay.removeClass('dd-civ-visible');
    // Only restore scroll if detail modal isn't also open
    if (!$detailOverlay || !$detailOverlay.hasClass('dd-civ-visible')) {
      $('body').css('overflow', '');
    }
  }

  function submitNewCivilian() {
    var c = cfg();
    var $form = $newOverlay.find('#dd-civ-new-form');

    var fullName = $.trim($form.find('[name="name"]').val());
    var birthday = $.trim($form.find('[name="birthday"]').val());
    if (!fullName) {
      toast('Name is required', 'error');
      return;
    }
    if (!birthday) {
      toast('Date of birth is required', 'error');
      return;
    }

    // Height: convert ft/in to total inches or use cm
    var heightMode = $form.find('.dd-civ-height-toggle.active').data('value');
    var height, heightClassification;
    if (heightMode === 'metric') {
      var cm = parseInt($form.find('[name="heightCm"]').val()) || 0;
      height = cm > 0 ? String(cm) : undefined;
      heightClassification = 'Metric';
    } else {
      var ft = parseInt($form.find('[name="heightFoot"]').val()) || 0;
      var inches = parseInt($form.find('[name="heightInches"]').val()) || 0;
      var totalIn = ft * 12 + inches;
      height = totalIn > 0 ? String(totalIn) : undefined;
      heightClassification = 'Imperial';
    }

    // Weight
    var weightMode = $form.find('.dd-civ-weight-toggle.active').data('value');
    var weight, weightClassification;
    if (weightMode === 'metric') {
      var kg = parseInt($form.find('[name="weightKg"]').val()) || 0;
      weight = kg > 0 ? String(kg) : undefined;
      weightClassification = 'kg';
    } else {
      var lbs = parseInt($form.find('[name="weightLbs"]').val()) || 0;
      weight = lbs > 0 ? String(lbs) : undefined;
      weightClassification = 'lbs';
    }

    var payload = {
      name: fullName,
      firstName: fullName.split(' ')[0] || '',
      lastName: fullName.split(' ').slice(1).join(' ') || '',
      birthday: birthday,
      address: $form.find('[name="address"]').val(),
      occupation: $form.find('[name="occupation"]').val(),
      gender: $form.find('[name="gender"]').val(),
      height: height,
      heightClassification: heightClassification,
      weight: weight,
      weightClassification: weightClassification,
      eyeColor: $form.find('[name="eyeColor"]').val(),
      hairColor: $form.find('[name="hairColor"]').val(),
      organDonor: $form.find('[name="organDonor"]').is(':checked'),
      veteran: $form.find('[name="veteran"]').is(':checked'),
      onParole: $form.find('[name="onParole"]').is(':checked'),
      onProbation: $form.find('[name="onProbation"]').is(':checked'),
      image: $form.find('[name="image"]').val(),
      userID: c.userId,
      activeCommunityID: c.communityId
    };

    // Only set approval status when community has the approval system enabled
    if (approvalSystemEnabled) {
      payload.approvalStatus = 'requested_review';
    }

    $.ajax({
      url: c.API_URL + '/api/v1/civilian',
      method: 'POST',
      headers: {},
      contentType: 'application/json',
      data: JSON.stringify(payload),
      success: function () {
        toast('Civilian created', 'success');
        closeNewModal();
        ddCivPage = 0;
        ddCivSearchTerm = '';
        $('#dd-civ-search').val('');
        loadCivilians();
        if (window.ddLimits) window.ddLimits.check('civilian');
      },
      error: function () {
        toast('Failed to create civilian', 'error');
      }
    });
  }

})();
