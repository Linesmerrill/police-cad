/**
 * Department Dashboard — 911 Emergency Call Component
 *
 * Registers window.ddOpen911 for the department dashboard.
 * Provides a department selection overlay and call submission form
 * for creating 911 emergency calls.
 */
(function () {
  'use strict';

  /* ───────────────────────────────────────────
     Helpers & Config
     ─────────────────────────────────────────── */

  var cfg = function () { return window.ddConfig || {}; };
  var esc = function (s) { return window.esc ? window.esc(s) : s || ''; };
  var toast = function (m, t) { if (window.ddToast) window.ddToast(m, t); };

  /* ───────────────────────────────────────────
     Inline Styles (<style> injected once)
     ─────────────────────────────────────────── */

  var stylesInjected = false;

  function injectStyles() {
    if (stylesInjected) return;
    if (document.getElementById('dd-911-styles')) { stylesInjected = true; return; }
    stylesInjected = true;

    var css = '' +
      /* ── Department Selection Overlay ── */
      '.dd-911-overlay{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity 0.25s;}' +
      '.dd-911-overlay.dd-911-visible{opacity:1;pointer-events:auto;}' +

      /* ── Panel ── */
      '.dd-911-panel{background:rgba(12,13,18,0.97);border:1px solid rgba(255,255,255,0.06);border-radius:16px;max-width:550px;width:95%;margin:auto;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.5);}' +

      /* ── Header ── */
      '.dd-911-header{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;border-bottom:1px solid rgba(255,255,255,0.06);}' +
      '.dd-911-title{font-size:1rem;font-weight:700;color:#fff;display:flex;align-items:center;gap:0.5rem;}' +
      '.dd-911-close{background:none;border:none;color:var(--dd-text-muted);font-size:1.25rem;cursor:pointer;padding:0.25rem;transition:color 0.2s;line-height:1;}' +
      '.dd-911-close:hover{color:var(--dd-text);}' +

      /* ── Body ── */
      '.dd-911-body{flex:1;overflow-y:auto;padding:1.25rem;}' +

      /* ── 911 Generic Card ── */
      '.dd-911-emergency-card{background:linear-gradient(135deg,rgba(239,68,68,0.2),rgba(239,68,68,0.08));border:1px solid rgba(239,68,68,0.3);border-radius:var(--dd-radius,12px);padding:1rem 1.25rem;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:0.875rem;margin-bottom:1rem;}' +
      '.dd-911-emergency-card:hover{background:linear-gradient(135deg,rgba(239,68,68,0.3),rgba(239,68,68,0.15));border-color:rgba(239,68,68,0.5);transform:translateY(-2px);}' +
      '.dd-911-emergency-icon{width:48px;height:48px;border-radius:50%;background:rgba(239,68,68,0.2);display:flex;align-items:center;justify-content:center;font-size:1.25rem;color:var(--dd-red,#ef4444);flex-shrink:0;}' +
      '.dd-911-emergency-info{flex:1;min-width:0;}' +
      '.dd-911-emergency-name{font-size:1rem;font-weight:700;color:#fff;}' +
      '.dd-911-emergency-desc{font-size:0.75rem;color:var(--dd-text-muted,#64748b);margin-top:0.15rem;}' +

      /* ── Department Cards Grid ── */
      '.dd-911-dept-label{font-size:0.75rem;font-weight:600;color:var(--dd-text-muted,#64748b);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.625rem;}' +
      '.dd-911-dept-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:0.625rem;}' +
      '.dd-911-dept-card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:var(--dd-radius,12px);padding:0.875rem 1rem;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:0.75rem;}' +
      '.dd-911-dept-card:hover{background:rgba(255,255,255,0.07);border-color:rgba(255,255,255,0.12);transform:translateY(-2px);}' +
      '.dd-911-dept-icon{width:40px;height:40px;border-radius:10px;background:rgba(139,92,246,0.15);display:flex;align-items:center;justify-content:center;font-size:1rem;color:var(--dd-accent,#8b5cf6);flex-shrink:0;}' +
      '.dd-911-dept-name{font-size:0.875rem;font-weight:600;color:var(--dd-text,#e2e8f0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +

      /* ── Loading & Empty ── */
      '.dd-911-loading{display:flex;align-items:center;justify-content:center;padding:2rem;color:var(--dd-text-muted,#64748b);font-size:0.875rem;gap:0.5rem;}' +
      '.dd-911-empty{text-align:center;padding:2rem 1rem;color:var(--dd-text-muted,#64748b);font-size:0.875rem;}' +

      /* ── Call Form ── */
      '.dd-911-form-grid{display:flex;flex-direction:column;gap:0.875rem;}' +
      '.dd-911-field{display:flex;flex-direction:column;gap:0.3rem;}' +
      '.dd-911-field label{font-size:0.75rem;font-weight:500;color:var(--dd-text-muted,#64748b);}' +
      '.dd-911-field input,.dd-911-field textarea{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:var(--dd-text,#e2e8f0);padding:0.625rem 0.75rem;font-size:0.875rem;font-family:inherit;outline:none;transition:border-color 0.2s,box-shadow 0.2s;resize:vertical;}' +
      '.dd-911-field input:focus,.dd-911-field textarea:focus{border-color:var(--dd-accent,#8b5cf6);box-shadow:0 0 0 2px rgba(139,92,246,0.15);}' +
      '.dd-911-field input::placeholder,.dd-911-field textarea::placeholder{color:var(--dd-text-muted,#64748b);opacity:0.7;}' +

      /* ── Form Buttons ── */
      '.dd-911-form-actions{display:flex;justify-content:flex-end;gap:0.5rem;margin-top:0.5rem;}' +
      '.dd-911-btn{padding:0.5rem 1rem;border:none;border-radius:var(--dd-radius,12px);font-size:0.8125rem;font-weight:600;cursor:pointer;transition:all 0.2s;font-family:inherit;}' +
      '.dd-911-btn-cancel{background:rgba(255,255,255,0.04);color:var(--dd-text,#e2e8f0);border:1px solid rgba(255,255,255,0.06);}' +
      '.dd-911-btn-cancel:hover{background:rgba(255,255,255,0.07);border-color:rgba(255,255,255,0.12);}' +
      '.dd-911-btn-submit{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;border:none;}' +
      '.dd-911-btn-submit:hover{filter:brightness(1.1);transform:translateY(-1px);}' +
      '.dd-911-btn-submit:disabled{opacity:0.5;cursor:default;transform:none;filter:none;}' +

      /* ── Dept badge in form ── */
      '.dd-911-form-dept{display:inline-flex;align-items:center;gap:0.4rem;padding:0.35rem 0.75rem;border-radius:999px;font-size:0.75rem;font-weight:600;margin-bottom:0.25rem;}' +
      '.dd-911-form-dept-generic{background:rgba(239,68,68,0.15);color:var(--dd-red,#ef4444);}' +
      '.dd-911-form-dept-specific{background:rgba(139,92,246,0.15);color:var(--dd-accent,#8b5cf6);}' +

      /* ── Responsive ── */
      '@media(max-width:600px){' +
        '.dd-911-panel{width:100vw;max-width:100vw;max-height:100vh;border-radius:0;}' +
        '.dd-911-dept-grid{grid-template-columns:1fr;}' +
      '}' +
    '';

    var $style = $('<style>').attr('id', 'dd-911-styles').text(css);
    $('head').append($style);
  }

  /* ───────────────────────────────────────────
     State
     ─────────────────────────────────────────── */

  var $selectOverlay = null;
  var $formOverlay = null;
  var selectedDept = null;     // { _id, name } or null for generic 911
  var cachedDepts = null;

  /* ───────────────────────────────────────────
     Department Selection Overlay
     ─────────────────────────────────────────── */

  function ensureSelectOverlay() {
    if ($selectOverlay) return;

    var html = '' +
      '<div class="dd-911-overlay" id="dd-911-select-overlay">' +
        '<div class="dd-911-panel">' +
          '<div class="dd-911-header">' +
            '<span class="dd-911-title">' +
              '<i class="fa fa-phone" style="color:var(--dd-red,#ef4444);"></i>' +
              '911 Emergency Call' +
            '</span>' +
            '<button class="dd-911-close" id="dd-911-select-close"><i class="fa fa-times"></i></button>' +
          '</div>' +
          '<div class="dd-911-body" id="dd-911-select-body">' +
            '<div class="dd-911-loading"><i class="fa fa-spinner fa-spin"></i> Loading departments...</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    $('body').append(html);
    $selectOverlay = $('#dd-911-select-overlay');

    // Close handlers
    $selectOverlay.on('click', function (e) {
      if ($(e.target).is($selectOverlay)) closeSelectOverlay();
    });
    $selectOverlay.on('click', '#dd-911-select-close', function () {
      closeSelectOverlay();
    });
  }

  function openSelectOverlay() {
    ensureSelectOverlay();
    $selectOverlay.addClass('dd-911-visible');
    loadDepartments();
  }

  function closeSelectOverlay() {
    if ($selectOverlay) $selectOverlay.removeClass('dd-911-visible');
  }

  function loadDepartments() {
    var c = cfg();
    var $body = $('#dd-911-select-body');

    // Use cache if available
    if (cachedDepts) {
      renderDepartmentSelection($body, cachedDepts);
      return;
    }

    $body.html('<div class="dd-911-loading"><i class="fa fa-spinner fa-spin"></i> Loading departments...</div>');

    $.ajax({
      url: c.API_URL + '/api/v1/community/' + c.communityId + '/departments',
      method: 'GET',
      success: function (data) {
        var depts = data.departments || data.data || data || [];
        if (!Array.isArray(depts)) depts = [];
        cachedDepts = depts;
        renderDepartmentSelection($body, depts);
      },
      error: function () {
        $body.html(
          '<div class="dd-911-empty">' +
            '<p>Failed to load departments.</p>' +
            '<button class="dd-911-btn dd-911-btn-cancel" id="dd-911-retry" style="margin-top:0.75rem;">' +
              '<i class="fa fa-refresh" style="margin-right:0.3rem;"></i>Retry' +
            '</button>' +
          '</div>'
        );
        $body.find('#dd-911-retry').on('click', function () {
          cachedDepts = null;
          loadDepartments();
        });
      }
    });
  }

  /** Only these department templates can receive 911 calls */
  var EMERGENCY_TEMPLATES = ['police', 'dispatch', 'fire', 'ems'];

  function isEmergencyDept(dept) {
    var tplName = (dept.template && dept.template.name || '').toLowerCase();
    return EMERGENCY_TEMPLATES.indexOf(tplName) !== -1;
  }

  function renderDepartmentSelection($body, depts) {
    var html = '';

    // Filter to only emergency-capable departments
    var emergencyDepts = depts.filter(isEmergencyDept);

    // Generic 911 card at top
    html += '' +
      '<div class="dd-911-emergency-card" id="dd-911-generic-call">' +
        '<div class="dd-911-emergency-icon"><i class="fa fa-phone"></i></div>' +
        '<div class="dd-911-emergency-info">' +
          '<div class="dd-911-emergency-name">Call 911</div>' +
          '<div class="dd-911-emergency-desc">General emergency — no specific department</div>' +
        '</div>' +
        '<i class="fa fa-chevron-right" style="color:var(--dd-text-muted,#64748b);"></i>' +
      '</div>';

    // Department cards (filtered to emergency services only)
    if (emergencyDepts.length) {
      html += '<div class="dd-911-dept-label">Or select a department</div>';
      html += '<div class="dd-911-dept-grid">';

      emergencyDepts.forEach(function (dept) {
        var deptId = dept._id || dept.id || '';
        var deptName = dept.name || dept.departmentName || 'Department';
        var icon = getDeptIcon(deptName);

        html += '' +
          '<div class="dd-911-dept-card" data-dept-id="' + esc(deptId) + '" data-dept-name="' + esc(deptName) + '">' +
            '<div class="dd-911-dept-icon"><i class="fa ' + icon + '"></i></div>' +
            '<div class="dd-911-dept-name">' + esc(deptName) + '</div>' +
            '<i class="fa fa-chevron-right" style="color:var(--dd-text-muted,#64748b);font-size:0.75rem;"></i>' +
          '</div>';
      });

      html += '</div>';
    }

    $body.html(html);

    // Wire click handlers
    $body.find('#dd-911-generic-call').on('click', function () {
      selectedDept = null;
      closeSelectOverlay();
      openFormOverlay();
    });

    $body.find('.dd-911-dept-card').on('click', function () {
      var id = $(this).attr('data-dept-id');
      var name = $(this).attr('data-dept-name');
      selectedDept = { _id: id, name: name };
      closeSelectOverlay();
      openFormOverlay();
    });
  }

  /** Map department name keywords to Font Awesome icons */
  function getDeptIcon(name) {
    var n = (name || '').toLowerCase();
    if (n.indexOf('police') !== -1 || n.indexOf('patrol') !== -1 || n.indexOf('pd') !== -1) return 'fa-shield-halved';
    if (n.indexOf('fire') !== -1) return 'fa-fire';
    if (n.indexOf('ems') !== -1 || n.indexOf('medic') !== -1 || n.indexOf('ambulance') !== -1) return 'fa-truck-medical';
    if (n.indexOf('sheriff') !== -1) return 'fa-star';
    if (n.indexOf('highway') !== -1 || n.indexOf('trooper') !== -1 || n.indexOf('state') !== -1) return 'fa-road';
    if (n.indexOf('swat') !== -1 || n.indexOf('tactical') !== -1) return 'fa-crosshairs';
    if (n.indexOf('dispatch') !== -1 || n.indexOf('comm') !== -1) return 'fa-headset';
    if (n.indexOf('marshal') !== -1 || n.indexOf('federal') !== -1) return 'fa-building-columns';
    return 'fa-building-shield';
  }

  /* ───────────────────────────────────────────
     Call Form Overlay
     ─────────────────────────────────────────── */

  function ensureFormOverlay() {
    if ($formOverlay) return;

    var html = '' +
      '<div class="dd-911-overlay" id="dd-911-form-overlay">' +
        '<div class="dd-911-panel">' +
          '<div class="dd-911-header">' +
            '<span class="dd-911-title">' +
              '<i class="fa fa-phone" style="color:var(--dd-red,#ef4444);"></i>' +
              '911 Emergency Call' +
            '</span>' +
            '<button class="dd-911-close" id="dd-911-form-close"><i class="fa fa-times"></i></button>' +
          '</div>' +
          '<div class="dd-911-body" id="dd-911-form-body"></div>' +
        '</div>' +
      '</div>';

    $('body').append(html);
    $formOverlay = $('#dd-911-form-overlay');

    // Close handlers
    $formOverlay.on('click', function (e) {
      if ($(e.target).is($formOverlay)) closeFormOverlay();
    });
    $formOverlay.on('click', '#dd-911-form-close', function () {
      closeFormOverlay();
    });
  }

  function openFormOverlay() {
    ensureFormOverlay();

    var deptBadge = '';
    if (selectedDept) {
      deptBadge = '<span class="dd-911-form-dept dd-911-form-dept-specific">' +
        '<i class="fa ' + getDeptIcon(selectedDept.name) + '"></i>' +
        esc(selectedDept.name) +
      '</span>';
    } else {
      deptBadge = '<span class="dd-911-form-dept dd-911-form-dept-generic">' +
        '<i class="fa fa-phone"></i>' +
        'General 911 Emergency' +
      '</span>';
    }

    var formHtml = '' +
      deptBadge +
      '<form id="dd-911-form" class="dd-911-form-grid">' +
        '<div class="dd-911-field">' +
          '<label>Your Name *</label>' +
          '<input type="text" name="callerName" maxlength="100" placeholder="Enter your name" required />' +
        '</div>' +
        '<div class="dd-911-field">' +
          '<label>Location *</label>' +
          '<input type="text" name="location" maxlength="100" placeholder="Where is the emergency?" required />' +
        '</div>' +
        '<div class="dd-911-field">' +
          '<label>Description of People Involved *</label>' +
          '<textarea name="peopleDescription" maxlength="500" rows="3" placeholder="Describe the people involved..." required></textarea>' +
        '</div>' +
        '<div class="dd-911-field">' +
          '<label>Description of What is Happening *</label>' +
          '<textarea name="callDescription" maxlength="500" rows="3" placeholder="Describe the emergency situation..." required></textarea>' +
        '</div>' +
        '<div class="dd-911-form-actions">' +
          '<button type="button" class="dd-911-btn dd-911-btn-cancel" id="dd-911-form-cancel">Cancel</button>' +
          '<button type="submit" class="dd-911-btn dd-911-btn-submit" id="dd-911-form-submit">' +
            '<i class="fa fa-phone" style="margin-right:0.3rem;"></i>Submit 911 Call' +
          '</button>' +
        '</div>' +
      '</form>';

    $('#dd-911-form-body').html(formHtml);
    $formOverlay.addClass('dd-911-visible');

    // Wire form events
    $formOverlay.find('#dd-911-form-cancel').off('click').on('click', function () {
      closeFormOverlay();
    });

    $formOverlay.find('#dd-911-form').off('submit').on('submit', function (e) {
      e.preventDefault();
      submitCall();
    });
  }

  function closeFormOverlay() {
    if ($formOverlay) $formOverlay.removeClass('dd-911-visible');
  }

  /* ───────────────────────────────────────────
     Submit 911 Call
     ─────────────────────────────────────────── */

  function submitCall() {
    var c = cfg();
    var $form = $formOverlay.find('#dd-911-form');
    var $submitBtn = $form.find('#dd-911-form-submit');

    var callerName = $.trim($form.find('[name="callerName"]').val());
    var location = $.trim($form.find('[name="location"]').val());
    var peopleDescription = $.trim($form.find('[name="peopleDescription"]').val());
    var callDescription = $.trim($form.find('[name="callDescription"]').val());

    // Validate
    if (!callerName) { toast('Your name is required', 'error'); return; }
    if (!location) { toast('Location is required', 'error'); return; }
    if (!peopleDescription) { toast('Description of people involved is required', 'error'); return; }
    if (!callDescription) { toast('Description of what is happening is required', 'error'); return; }

    // Disable submit during request
    $submitBtn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin" style="margin-right:0.3rem;"></i>Submitting...');

    var departments = [];
    if (selectedDept && selectedDept._id) {
      departments.push(selectedDept._id);
    }

    var payload = {
      title: '911: ' + location,
      details: '911 Caller: ' + callerName +
        '\nLocation: ' + location +
        '\nPeople: ' + peopleDescription +
        '\n\nDescription: ' + callDescription,
      departments: departments,
      status: true,
      communityId: c.communityId,
      createdByID: c.userId,
      createdByUsername: c.userName
    };

    $.ajax({
      url: c.API_URL + '/api/v1/calls',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(payload),
      success: function () {
        toast('911 call submitted successfully', 'success');
        closeFormOverlay();
        closeSelectOverlay();
      },
      error: function () {
        toast('Failed to submit 911 call', 'error');
        $submitBtn.prop('disabled', false).html('<i class="fa fa-phone" style="margin-right:0.3rem;"></i>Submit 911 Call');
      }
    });
  }

  /* ───────────────────────────────────────────
     Public API
     ─────────────────────────────────────────── */

  window.ddOpen911 = function () {
    injectStyles();
    // Clear department cache so we always get fresh data on open
    cachedDepts = null;
    openSelectOverlay();
  };

})();
