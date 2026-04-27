/**
 * Beta feature opt-out feedback modal — shared by Settings and the
 * Command Dashboard's "Classic" button. Self-contained: injects its own
 * markup + styles on first use.
 *
 *   window.cdPromptBetaFeedback({
 *     flag:    'betaCommandDashboard' | 'betaCommandDispatch' | 'betaCivDashboard',
 *     label:   'the Command Dashboard',      // shown in the modal title
 *     context: '/command-dashboard',         // optional, defaults to location.pathname
 *     userId:  '<the current user id>',
 *     apiUrl:  'https://api.example.com',    // defaults to window.ddConfig.API_URL
 *     onConfirm: function() { ... },         // ALWAYS called, even on skip/cancel
 *     onCancel:  function() { ... },         // only when user cancels; onConfirm NOT fired
 *   });
 *
 * The caller is responsible for the actual opt-out action (e.g. PUT the
 * user-preferences flag). This module only captures feedback and then
 * yields back to that action via onConfirm.
 */
;(function () {
  'use strict';

  var STYLE_ID = 'cd-beta-feedback-styles';
  var MODAL_ID = 'cd-beta-feedback-modal';

  var REASONS = [
    { value: 'too_buggy',        label: 'Too buggy or unreliable' },
    { value: 'look_and_feel',    label: 'Didn\'t like the look & feel' },
    { value: 'preferred_old',    label: 'Preferred the classic version' },
    { value: 'missing_features', label: 'Missing features I rely on' },
    { value: 'performance',      label: 'Slow or laggy' },
    { value: 'other',            label: 'Something else' },
  ];

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var css = [
      '#' + MODAL_ID + '{position:fixed;inset:0;z-index:10001;background:rgba(3,7,18,0.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;padding:1rem;font-family:inherit;}',
      '#' + MODAL_ID + '.is-open{display:flex;animation:cd-bfm-fade .18s ease-out;}',
      '@keyframes cd-bfm-fade{from{opacity:0;}to{opacity:1;}}',
      '.cd-bfm-panel{width:min(460px,100%);background:#0f172a;border:1px solid rgba(148,163,184,0.15);border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,0.5);padding:22px 22px 18px;color:#e2e8f0;}',
      '.cd-bfm-title{font:600 16px/1.25 inherit;margin:0 0 4px;letter-spacing:-0.01em;}',
      '.cd-bfm-lead{font:400 13px/1.45 inherit;color:#94a3b8;margin:0 0 16px;}',
      '.cd-bfm-reasons{display:flex;flex-direction:column;gap:6px;margin:0 0 14px;}',
      '.cd-bfm-reason{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:8px;border:1px solid rgba(148,163,184,0.12);background:rgba(15,23,42,0.6);cursor:pointer;transition:border-color .12s,background .12s;}',
      '.cd-bfm-reason:hover{border-color:rgba(148,163,184,0.3);background:rgba(15,23,42,0.8);}',
      '.cd-bfm-reason input[type="radio"]{margin-top:2px;accent-color:#38bdf8;flex-shrink:0;}',
      '.cd-bfm-reason[data-selected="1"]{border-color:rgba(56,189,248,0.45);background:rgba(56,189,248,0.06);}',
      '.cd-bfm-reason-label{font:500 13px/1.35 inherit;color:#e2e8f0;}',
      '.cd-bfm-textarea{width:100%;min-height:72px;max-height:180px;padding:9px 11px;margin:0 0 14px;background:rgba(15,23,42,0.65);border:1px solid rgba(148,163,184,0.15);border-radius:8px;color:#e2e8f0;font:13px/1.45 inherit;resize:vertical;}',
      '.cd-bfm-textarea:focus{outline:none;border-color:rgba(56,189,248,0.45);background:rgba(15,23,42,0.85);}',
      '.cd-bfm-actions{display:flex;justify-content:space-between;gap:8px;align-items:center;}',
      '.cd-bfm-actions-right{display:flex;gap:8px;}',
      '.cd-bfm-btn{padding:8px 14px;border-radius:8px;border:none;cursor:pointer;font:600 13px/1 inherit;}',
      '.cd-bfm-btn-skip{background:transparent;color:#64748b;border:0;padding:8px 2px;font:500 12px/1 inherit;text-decoration:underline;}',
      '.cd-bfm-btn-skip:hover{color:#94a3b8;}',
      '.cd-bfm-btn-secondary{background:transparent;color:#94a3b8;border:1px solid rgba(148,163,184,0.2);}',
      '.cd-bfm-btn-secondary:hover{color:#e2e8f0;border-color:rgba(148,163,184,0.4);}',
      '.cd-bfm-btn-primary{background:linear-gradient(135deg,#ef4444,#f97316);color:#0b051a;}',
      '.cd-bfm-btn-primary:disabled{opacity:0.5;cursor:not-allowed;}',
    ].join('');
    var el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = css;
    document.head.appendChild(el);
  }

  function ensureMarkup() {
    var existing = document.getElementById(MODAL_ID);
    if (existing) return existing;
    injectStyles();
    var wrap = document.createElement('div');
    wrap.id = MODAL_ID;
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    var reasonsHtml = REASONS.map(function (r) {
      return (
        '<label class="cd-bfm-reason" data-value="' + r.value + '">' +
          '<input type="radio" name="cd-bfm-reason" value="' + r.value + '">' +
          '<span class="cd-bfm-reason-label">' + r.label + '</span>' +
        '</label>'
      );
    }).join('');
    wrap.innerHTML = (
      '<div class="cd-bfm-panel">' +
        '<h3 class="cd-bfm-title">Before you switch back<span class="cd-bfm-feature-suffix"></span></h3>' +
        '<p class="cd-bfm-lead">Help us improve. What\'s the main reason? (optional)</p>' +
        '<div class="cd-bfm-reasons">' + reasonsHtml + '</div>' +
        '<textarea class="cd-bfm-textarea" placeholder="Anything specific we should know? (optional)" maxlength="2000"></textarea>' +
        '<div class="cd-bfm-actions">' +
          '<button type="button" class="cd-bfm-btn-skip">Skip &amp; continue</button>' +
          '<div class="cd-bfm-actions-right">' +
            '<button type="button" class="cd-bfm-btn cd-bfm-btn-secondary" data-action="cancel">Cancel</button>' +
            '<button type="button" class="cd-bfm-btn cd-bfm-btn-primary" data-action="confirm">Send &amp; continue</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
    document.body.appendChild(wrap);
    return wrap;
  }

  function postFeedback(opts, reason, feedback) {
    var apiUrl = opts.apiUrl || (window.ddConfig && window.ddConfig.API_URL) || '';
    var userId = opts.userId || (window.ddConfig && window.ddConfig.userId) || '';
    if (!apiUrl || !userId || !opts.flag || !reason) return;
    try {
      // Use jQuery if available (all dashboards include it), else fall back
      // to fetch so Settings pages without jQuery still work.
      if (window.jQuery) {
        window.jQuery.ajax({
          url: apiUrl + '/api/v1/beta-feedback',
          method: 'POST',
          contentType: 'application/json',
          data: JSON.stringify({
            userId: userId,
            flag: opts.flag,
            reason: reason,
            feedback: feedback || '',
            context: opts.context || window.location.pathname || '',
          }),
        });
      } else if (window.fetch) {
        window.fetch(apiUrl + '/api/v1/beta-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            flag: opts.flag,
            reason: reason,
            feedback: feedback || '',
            context: opts.context || window.location.pathname || '',
          }),
        }).catch(function () { /* best-effort */ });
      }
    } catch (_) { /* best-effort */ }
  }

  window.cdPromptBetaFeedback = function (opts) {
    opts = opts || {};
    var modal = ensureMarkup();
    var titleSuffix = modal.querySelector('.cd-bfm-feature-suffix');
    if (titleSuffix) titleSuffix.textContent = opts.label ? ' from ' + opts.label : '';

    // Reset state
    var radios = modal.querySelectorAll('input[name="cd-bfm-reason"]');
    radios.forEach(function (r) { r.checked = false; });
    modal.querySelectorAll('.cd-bfm-reason').forEach(function (el) { el.removeAttribute('data-selected'); });
    var ta = modal.querySelector('.cd-bfm-textarea');
    if (ta) ta.value = '';

    modal.classList.add('is-open');

    var cancelBtn  = modal.querySelector('[data-action="cancel"]');
    var confirmBtn = modal.querySelector('[data-action="confirm"]');
    var skipBtn    = modal.querySelector('.cd-bfm-btn-skip');

    function cleanup() {
      modal.classList.remove('is-open');
      cancelBtn.removeEventListener('click', onCancel);
      confirmBtn.removeEventListener('click', onConfirm);
      skipBtn.removeEventListener('click', onSkip);
      modal.removeEventListener('click', onBackdrop);
      document.removeEventListener('keydown', onKey);
      modal.querySelectorAll('.cd-bfm-reason').forEach(function (el) {
        el.removeEventListener('click', onReasonClick);
      });
    }
    function onCancel() { cleanup(); if (typeof opts.onCancel === 'function') opts.onCancel(); }
    function onBackdrop(e) { if (e.target === modal) onCancel(); }
    function onKey(e) { if (e.key === 'Escape') onCancel(); }
    function onReasonClick(e) {
      modal.querySelectorAll('.cd-bfm-reason').forEach(function (el) { el.removeAttribute('data-selected'); });
      e.currentTarget.setAttribute('data-selected', '1');
    }
    function collectReason() {
      var checked = modal.querySelector('input[name="cd-bfm-reason"]:checked');
      return checked ? checked.value : '';
    }
    function onConfirm() {
      var reason = collectReason();
      var feedback = ta ? (ta.value || '').trim() : '';
      // If they wrote nothing AND picked nothing, treat like Skip so we
      // don't create empty DB rows.
      if (reason || feedback) {
        postFeedback(opts, reason || 'other', feedback);
      }
      cleanup();
      if (typeof opts.onConfirm === 'function') opts.onConfirm();
    }
    function onSkip() {
      cleanup();
      if (typeof opts.onConfirm === 'function') opts.onConfirm();
    }

    cancelBtn.addEventListener('click', onCancel);
    confirmBtn.addEventListener('click', onConfirm);
    skipBtn.addEventListener('click', onSkip);
    modal.addEventListener('click', onBackdrop);
    document.addEventListener('keydown', onKey);
    modal.querySelectorAll('.cd-bfm-reason').forEach(function (el) {
      el.addEventListener('click', onReasonClick);
    });

    // Focus the first reason for keyboard users
    setTimeout(function () {
      var first = modal.querySelector('input[name="cd-bfm-reason"]');
      if (first) first.focus();
    }, 30);
  };
})();
