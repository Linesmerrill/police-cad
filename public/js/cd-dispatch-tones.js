/**
 * Command Dashboard — Dispatch Tone Board (light port)
 *
 * Loads community tone presets + custom groups and renders activation buttons
 * into #cd-dispatch-tones. Plays nicely with the existing tone_activated
 * socket listener in cd-alerts.js.
 *
 *   GET  /api/v1/community/{communityId}/tone-groups
 *   POST /api/v1/community/{communityId}/tones
 */
;(function () {
  'use strict';

  function cfg()  { return window.ddConfig || {}; }
  function api()  { return cfg().API_URL || ''; }
  function esc(s) { return window.esc ? window.esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function toast(m, t) { if (window.ddToast) window.ddToast(m, t); }

  var ICON_MAP = {
    leo:  'fa-shield-halved',
    fd:   'fa-fire',
    ems:  'fa-truck-medical',
  };

  var DEPT_COLORS = {
    leo: '#3b82f6',
    fd:  '#ef4444',
    ems: '#f8fafc',
  };

  var state = { presets: [], customGroups: [], loading: false, cooldown: {} };

  window.cdDispatchTonesInit = function () {
    injectStyles();
    render();
    load();
  };

  function load() {
    var communityId = cfg().communityId;
    if (!communityId) return;
    state.loading = true;
    render();
    $.ajax({
      url: api() + '/api/v1/community/' + encodeURIComponent(communityId) + '/tone-groups',
      method: 'GET',
    }).done(function (res) {
      state.presets      = (res && res.presets) || [];
      state.customGroups = (res && res.customGroups) || [];
      state.loading = false;
      render();
    }).fail(function (xhr) {
      state.loading = false;
      if (xhr && xhr.status === 404) {
        $('#cd-dispatch-tones').html('<div class="cd-dispatch-placeholder"><i class="fa fa-tower-broadcast"></i><div>Tone board API not available in this environment.</div></div>');
      } else {
        $('#cd-dispatch-tones').html('<div class="cd-dispatch-placeholder"><i class="fa fa-triangle-exclamation"></i><div>Failed to load tones.</div></div>');
      }
    });
  }

  function render() {
    var $host = $('#cd-dispatch-tones');
    if (!$host.length) return;
    if (state.loading) {
      $host.html('<div class="cd-dispatch-placeholder"><i class="fa fa-circle-notch fa-spin"></i><div>Loading tones…</div></div>');
      return;
    }
    var all = (state.presets || []).concat(state.customGroups || []);
    if (!all.length) {
      $host.html('<div class="cd-dispatch-placeholder"><i class="fa fa-tower-broadcast"></i><div>No tone groups configured for this community.</div></div>');
      return;
    }

    var html = '<div class="cd-tones-grid">' + all.map(function (t) {
      var tone = t.toneSound || 'leo';
      var icon = ICON_MAP[tone] || 'fa-tower-broadcast';
      var color = DEPT_COLORS[tone] || 'var(--cd-accent)';
      var name = t.name || tone.toUpperCase();
      return (
        '<button type="button" class="cd-tones-btn" data-tone-sound="' + esc(tone) + '" data-tone-name="' + esc(name) + '" data-dept-ids="' + esc((t.departmentIds || []).join(',')) + '" style="--cd-dept-color:' + esc(color) + ';">' +
          '<i class="fa ' + esc(icon) + '"></i>' +
          '<span>' + esc(name) + '</span>' +
        '</button>'
      );
    }).join('') + '</div>';
    $host.html(html);

    $host.off('click.cdTones').on('click.cdTones', '.cd-tones-btn', function () {
      var $btn = $(this);
      var key = $btn.data('tone-name') + ':' + $btn.data('dept-ids');
      if (state.cooldown[key]) return;
      sendTone($btn);
    });
  }

  function sendTone($btn) {
    var communityId = cfg().communityId;
    if (!communityId) return;
    var toneSound = $btn.data('tone-sound');
    var name = $btn.data('tone-name');
    var deptIds = String($btn.data('dept-ids') || '').split(',').filter(Boolean);

    var dbUser = cfg().dbUser || {};
    var me = dbUser.user || {};
    var callSign = '';
    if (me.lastAccessedCommunity && me.lastAccessedCommunity.departmentCallSigns) {
      callSign = Object.values(me.lastAccessedCommunity.departmentCallSigns)[0] || '';
    }

    $btn.addClass('is-sending').prop('disabled', true);
    var key = name + ':' + deptIds.join(',');
    state.cooldown[key] = true;

    $.ajax({
      url: api() + '/api/v1/community/' + encodeURIComponent(communityId) + '/tones',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        toneType: toneSound,
        toneName: name,
        targetDeptIds: deptIds,
        triggeredById: dbUser._id || cfg().userId,
        triggeredByName: me.username || cfg().userName || '',
        triggeredByCallSign: callSign,
      }),
    }).done(function () {
      $btn.removeClass('is-sending').addClass('is-sent');
      setTimeout(function () { $btn.removeClass('is-sent'); }, 800);
    }).fail(function (xhr) {
      toast('Failed to send tone', 'error');
      console.error('[cd-dispatch-tones] send failed', xhr && xhr.responseText);
      $btn.removeClass('is-sending');
    }).always(function () {
      setTimeout(function () {
        state.cooldown[key] = false;
        $btn.prop('disabled', false);
      }, 3000);
    });
  }

  function injectStyles() {
    if (document.getElementById('cd-dispatch-tones-styles')) return;
    var css = [
      '.cd-tones-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:0.375rem;}',
      '.cd-tones-btn{display:flex;align-items:center;gap:0.5rem;padding:0.5625rem 0.75rem;border-radius:8px;border:1px solid color-mix(in srgb,var(--cd-dept-color) 30%,transparent);background:color-mix(in srgb,var(--cd-dept-color) 10%,transparent);color:var(--cd-text);font:600 0.75rem/1 inherit;cursor:pointer;transition:all .15s;}',
      '.cd-tones-btn i{color:var(--cd-dept-color);font-size:0.875rem;}',
      '.cd-tones-btn:hover:not([disabled]){background:color-mix(in srgb,var(--cd-dept-color) 18%,transparent);transform:translateY(-1px);}',
      '.cd-tones-btn.is-sending{background:color-mix(in srgb,var(--cd-dept-color) 24%,transparent);animation:cd-tones-pulse 0.9s ease-in-out infinite;}',
      '.cd-tones-btn.is-sent{background:rgba(34,197,94,0.12);border-color:rgba(34,197,94,0.4);color:#86efac;}',
      '.cd-tones-btn.is-sent i{color:#86efac;}',
      '.cd-tones-btn[disabled]{opacity:0.6;cursor:not-allowed;}',
      '@keyframes cd-tones-pulse{0%,100%{box-shadow:0 0 0 0 color-mix(in srgb,var(--cd-dept-color) 18%,transparent);}50%{box-shadow:0 0 0 6px color-mix(in srgb,var(--cd-dept-color) 0%,transparent);}}',
    ].join('');
    var el = document.createElement('style');
    el.id = 'cd-dispatch-tones-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }
})();
