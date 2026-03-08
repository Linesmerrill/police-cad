/**
 * Department Dashboard — Creation Limits
 *
 * Enforces community-wide creation limits for civilians, vehicles, and
 * firearms.  Limits only apply to departments with a "civilian" template.
 *
 * Usage (from component init or after create/delete):
 *   window.ddLimits.check('civilian')
 *   window.ddLimits.check('vehicle')
 *   window.ddLimits.check('firearm')
 */
(function () {
  'use strict';

  var cfg = function () { return window.ddConfig || {}; };

  /* ── Type config ────────────────────────── */

  var types = {
    civilian: {
      enabledField: 'civilianCreationLimitsEnabled',
      limitField: 'civilianCreationLimit',
      countPath: '/api/v1/civilians/user/',
      btnSelector: '#dd-civ-add-btn',
      label: 'civilian',
      plural: 'civilians',
      icon: 'fa-users',
      accentRgb: '59,130,246'
    },
    vehicle: {
      enabledField: 'vehicleCreationLimitsEnabled',
      limitField: 'vehicleCreationLimit',
      countPath: '/api/v1/vehicles/user/',
      btnSelector: '#dd-veh-add-btn',
      label: 'vehicle',
      plural: 'vehicles',
      icon: 'fa-car',
      accentRgb: '59,130,246'
    },
    firearm: {
      enabledField: 'firearmCreationLimitsEnabled',
      limitField: 'firearmCreationLimit',
      countPath: '/api/v1/firearms/user/',
      btnSelector: '#dd-fa-add-btn',
      label: 'firearm',
      plural: 'firearms',
      icon: 'fa-crosshairs',
      accentRgb: '239,68,68'
    }
  };

  /* ── Admin check (mirrors dd-settings.js getUserPermissions) ── */

  function isAdminUser() {
    var c = cfg();
    var userId = c.userId || '';
    var community = c.communityData || {};
    if ((community.ownerID || '') === userId) return true;
    var roles = community.roles || [];
    for (var i = 0; i < roles.length; i++) {
      var role = roles[i];
      if ((role.members || []).indexOf(userId) === -1) continue;
      var perms = role.permissions || [];
      for (var j = 0; j < perms.length; j++) {
        if (perms[j].name === 'administrator' && perms[j].enabled) return true;
      }
    }
    return false;
  }

  /* ── Inject styles once ─────────────────── */

  var stylesInjected = false;
  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    var css =
      /* Limit-reached button override */
      '.dd-limit-btn-blocked{' +
        'opacity:1 !important;' +
        'cursor:not-allowed !important;' +
        'background:rgba(239,68,68,0.08) !important;' +
        'border-color:rgba(239,68,68,0.2) !important;' +
        'color:#f87171 !important;' +
        'gap:0.5rem !important;' +
      '}' +
      '.dd-limit-btn-blocked:hover{' +
        'background:rgba(239,68,68,0.12) !important;' +
        'border-color:rgba(239,68,68,0.3) !important;' +
        'transform:none !important;' +
        'filter:none !important;' +
      '}' +

      /* Admin badge chip */
      '.dd-limit-admin-chip{' +
        'display:inline-flex;align-items:center;gap:0.2rem;' +
        'font-size:0.5625rem;font-weight:600;letter-spacing:0.03em;text-transform:uppercase;' +
        'padding:0.15rem 0.4rem;border-radius:4px;margin-left:0.4rem;' +
        'background:rgba(139,92,246,0.12);color:#a78bfa;border:1px solid rgba(139,92,246,0.2);' +
        'line-height:1;vertical-align:middle;' +
      '}' +

      /* Progress bar in button */
      '.dd-limit-progress{' +
        'display:inline-flex;align-items:center;gap:0.35rem;' +
        'margin-left:0.35rem;font-size:0.625rem;color:var(--dd-text-dim);' +
      '}' +
      '.dd-limit-bar{' +
        'width:32px;height:3px;border-radius:2px;background:rgba(255,255,255,0.06);overflow:hidden;' +
      '}' +
      '.dd-limit-bar-fill{' +
        'height:100%;border-radius:2px;transition:width 0.4s ease;' +
      '}' +

      /* Warning overlay */
      '.dd-limit-warn{' +
        'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;' +
        'background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);' +
        'opacity:0;transition:opacity 0.2s ease;' +
      '}' +
      '.dd-limit-warn.open{opacity:1;}' +
      '.dd-limit-warn-card{' +
        'width:100%;max-width:380px;margin:1rem;' +
        'background:rgba(15,17,23,0.95);border:1px solid var(--dd-glass-border);' +
        'border-radius:var(--dd-radius);overflow:hidden;' +
        'box-shadow:0 24px 64px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.03) inset;' +
        'transform:translateY(12px) scale(0.97);transition:transform 0.25s ease;' +
      '}' +
      '.dd-limit-warn.open .dd-limit-warn-card{transform:translateY(0) scale(1);}' +
      '.dd-limit-warn-header{' +
        'padding:1.25rem 1.25rem 0;display:flex;align-items:center;justify-content:space-between;' +
      '}' +
      '.dd-limit-warn-title{font-size:0.875rem;font-weight:600;color:var(--dd-text);display:flex;align-items:center;gap:0.5rem;}' +
      '.dd-limit-warn-close{background:none;border:none;color:var(--dd-text-dim);cursor:pointer;padding:0.25rem;border-radius:6px;transition:all 0.15s;font-size:0.875rem;}' +
      '.dd-limit-warn-close:hover{color:var(--dd-text);background:var(--dd-glass);}' +
      '.dd-limit-warn-body{padding:1.25rem;}' +
      '.dd-limit-warn-meter{' +
        'display:flex;align-items:center;gap:0.75rem;' +
        'padding:0.75rem;border-radius:var(--dd-radius-sm);' +
        'background:var(--dd-glass);border:1px solid var(--dd-glass-border);margin-bottom:0.75rem;' +
      '}' +
      '.dd-limit-warn-meter-icon{' +
        'width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;' +
      '}' +
      '.dd-limit-warn-meter-bar{flex:1;min-width:0;}' +
      '.dd-limit-warn-meter-label{display:flex;justify-content:space-between;font-size:0.6875rem;margin-bottom:0.35rem;}' +
      '.dd-limit-warn-meter-track{height:6px;border-radius:3px;background:rgba(255,255,255,0.06);overflow:hidden;}' +
      '.dd-limit-warn-meter-fill{height:100%;border-radius:3px;transition:width 0.5s ease;}' +
      '.dd-limit-warn-hint{' +
        'font-size:0.75rem;color:var(--dd-text-dim);line-height:1.5;' +
        'padding:0.65rem 0.75rem;border-radius:var(--dd-radius-sm);' +
        'background:var(--dd-glass);border:1px solid var(--dd-glass-border);' +
      '}' +
      '.dd-limit-warn-hint i{margin-right:0.35rem;}' +
      '.dd-limit-warn-footer{' +
        'padding:0 1.25rem 1.25rem;display:flex;justify-content:flex-end;' +
      '}';

    $('<style>').text(css).appendTo('head');
  }

  /* ── Warning overlay ────────────────────── */

  function showLimitWarning(t, count, limit) {
    injectStyles();
    var id = 'dd-limit-warn-overlay';
    $('#' + id).remove();

    var pct = Math.min(Math.round((count / limit) * 100), 100);

    var html =
      '<div class="dd-limit-warn" id="' + id + '">' +
        '<div class="dd-limit-warn-card">' +
          '<div class="dd-limit-warn-header">' +
            '<div class="dd-limit-warn-title">' +
              '<i class="fa fa-exclamation-triangle" style="color:var(--dd-amber);"></i>' +
              'Limit Reached' +
            '</div>' +
            '<button class="dd-limit-warn-close" id="dd-limit-warn-close"><i class="fa fa-times"></i></button>' +
          '</div>' +
          '<div class="dd-limit-warn-body">' +
            '<div class="dd-limit-warn-meter">' +
              '<div class="dd-limit-warn-meter-icon" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.15);">' +
                '<i class="fa ' + t.icon + '" style="color:#f87171;font-size:0.875rem;"></i>' +
              '</div>' +
              '<div class="dd-limit-warn-meter-bar">' +
                '<div class="dd-limit-warn-meter-label">' +
                  '<span style="color:var(--dd-text-muted);">' + count + ' / ' + limit + ' ' + t.plural + '</span>' +
                  '<span style="color:#f87171;font-weight:600;">' + pct + '%</span>' +
                '</div>' +
                '<div class="dd-limit-warn-meter-track">' +
                  '<div class="dd-limit-warn-meter-fill" style="width:' + pct + '%;background:linear-gradient(90deg,#ef4444,#f87171);"></div>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="dd-limit-warn-hint">' +
              '<i class="fa fa-lightbulb" style="color:var(--dd-amber);"></i>' +
              'Contact your community administrator to increase the ' + t.label + ' limit or have them create one for you.' +
            '</div>' +
          '</div>' +
          '<div class="dd-limit-warn-footer">' +
            '<button class="dd-civ-btn dd-civ-btn-secondary" id="dd-limit-warn-ok" style="font-size:0.75rem;padding:0.4rem 1rem;">Got it</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    $('body').append(html);
    setTimeout(function () { $('#' + id).addClass('open'); }, 10);

    function close() {
      var $o = $('#' + id);
      $o.removeClass('open');
      setTimeout(function () { $o.remove(); }, 250);
    }
    $('#dd-limit-warn-close, #dd-limit-warn-ok').on('click', close);
    $('#' + id).on('click', function (e) {
      if (e.target === this) close();
    });
  }

  /* ── Button state helpers ───────────────── */

  function setButtonLimited($btn, t, count, limit) {
    injectStyles();
    $btn
      .data('dd-limit-blocked', true)
      .data('dd-limit-info', { t: t, count: count, limit: limit })
      .addClass('dd-limit-btn-blocked')
      .attr('title', 'You have reached your limit of ' + limit + ' ' + t.plural)
      .html(
        '<i class="fa fa-lock" style="font-size:0.625rem;"></i> ' +
        'Limit Reached' +
        '<span style="opacity:0.5;font-weight:400;">' + count + '/' + limit + '</span>'
      );

    // Intercept clicks at capture phase so it fires before component handlers
    var el = $btn[0];
    if (el && !el._ddLimitHandler) {
      el._ddLimitHandler = function (e) {
        var info = $(el).data('dd-limit-info');
        if ($(el).data('dd-limit-blocked') && info) {
          e.preventDefault();
          e.stopImmediatePropagation();
          showLimitWarning(info.t, info.count, info.limit);
        }
      };
      el.addEventListener('click', el._ddLimitHandler, true);
    }
  }

  function setButtonEnabled($btn, t, count, limit) {
    injectStyles();
    var pct = limit > 0 ? Math.round((count / limit) * 100) : 0;
    var fillColor = pct >= 80 ? '#f59e0b' : 'rgba(139,92,246,0.6)';
    $btn
      .removeData('dd-limit-blocked')
      .removeData('dd-limit-info')
      .removeClass('dd-limit-btn-blocked')
      .css({ opacity: '', cursor: '' })
      .attr('title', count + ' of ' + limit + ' ' + t.plural + ' used')
      .html(
        '<i class="fa fa-plus"></i> Add New ' + t.label.charAt(0).toUpperCase() + t.label.slice(1) +
        '<span class="dd-limit-progress">' +
          '<span class="dd-limit-bar"><span class="dd-limit-bar-fill" style="width:' + pct + '%;background:' + fillColor + ';"></span></span>' +
          '<span>' + count + '/' + limit + '</span>' +
        '</span>'
      );
  }

  function setButtonAdmin($btn, t) {
    injectStyles();
    $btn
      .removeData('dd-limit-blocked')
      .removeData('dd-limit-info')
      .removeClass('dd-limit-btn-blocked')
      .css({ opacity: '', cursor: '' })
      .attr('title', 'Create new ' + t.label + ' \u2014 admin bypass active')
      .html(
        '<i class="fa fa-plus"></i> Add New ' + t.label.charAt(0).toUpperCase() + t.label.slice(1) +
        '<span class="dd-limit-admin-chip"><i class="fa fa-shield"></i> No Limit</span>'
      );
  }

  /* ── Main check ─────────────────────────── */

  function check(typeName) {
    var t = types[typeName];
    if (!t) return;

    var c = cfg();
    var dept = c.departmentData || {};
    var tplName = ((dept.template && dept.template.name) || '').toLowerCase();

    // Only enforce limits for civilian-type departments
    if (tplName !== 'civilian') return;

    var community = c.communityData || {};
    if (!community[t.enabledField]) return; // limits not enabled

    var limit = community[t.limitField] || 5;
    var $btn = $(t.btnSelector);
    if (!$btn.length) return;

    // Admins bypass limits
    if (isAdminUser()) {
      setButtonAdmin($btn, t);
      return;
    }

    // Fetch current count
    var url = c.API_URL + t.countPath + encodeURIComponent(c.userId) +
              '?active_community_id=' + encodeURIComponent(c.communityId);
    $.ajax({
      url: url,
      method: 'GET',
      success: function (res) {
        var count = 0;
        if (Array.isArray(res)) {
          count = res.length;
        } else if (res && Array.isArray(res.data)) {
          count = res.totalCount || res.data.length;
        }

        if (count >= limit) {
          setButtonLimited($btn, t, count, limit);
        } else {
          setButtonEnabled($btn, t, count, limit);
        }
      },
      error: function () {
        // Silently skip — limits check won't block the user
      }
    });
  }

  /* ── Public API ─────────────────────────── */

  window.ddLimits = { check: check };
})();
