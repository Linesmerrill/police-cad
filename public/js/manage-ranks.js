/* Manage Ranks — shared module.
 *
 * Drives the `views/partials/manage-ranks.ejs` markup. Used by two surfaces:
 *   1. community-details.ejs — wrapped in a modal overlay (#rankManagementModal)
 *   2. department-dashboard.ejs (dd-settings Ranks tab) — embedded inline
 *
 * Only one instance is mounted at a time; we keep the DOM IDs from the
 * original implementation so call sites that reach in (e.g. the
 * edit-department modal's pending-promo badge) keep working.
 *
 * Configure once per page via:
 *   window.manageRanks.configure({ communityId, userId });
 */
(function () {
  // --- module state ---
  var _communityId = '';
  var _userId = '';
  var _deptId = null;
  var _ranks = [];
  var _metricTypes = [];
  var _members = [];
  var _pendingPromotions = [];
  var _resetStatsOnPromotion = false;

  var _membersPage = 1;
  var _membersTotalPages = 1;
  var _membersLimit = 20;
  var _memberSearchTerm = '';
  var _memberSearchTimer = null;
  var _assignInFlight = {};
  var _confettiFrame = null;

  function getApi() {
    // community-details.ejs sets `window.API_URL` directly. department- and
    // command-dashboard wrap their script in an IIFE, so `API_URL` is local
    // to that closure and not visible here — fall through to `ddConfig` in
    // that case before resorting to the hardcoded prod URL.
    if (typeof API_URL !== 'undefined' && API_URL) return API_URL;
    if (typeof window !== 'undefined') {
      if (window.API_URL) return window.API_URL;
      if (window.ddConfig && window.ddConfig.API_URL) return window.ddConfig.API_URL;
    }
    return 'https://police-cad-app-api-bc6d659b60b3.herokuapp.com';
  }

  function escapeRankHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ---------- Configuration ----------

  function configure(opts) {
    opts = opts || {};
    if (opts.communityId) _communityId = opts.communityId;
    if (opts.userId) _userId = opts.userId;
  }

  // ---------- Lifecycle ----------

  function init(opts) {
    opts = opts || {};
    if (opts.communityId) _communityId = opts.communityId;
    if (opts.userId) _userId = opts.userId;
    _deptId = opts.deptId || null;

    var nameEl = document.getElementById('rankMgmtDeptName');
    if (nameEl) nameEl.textContent = opts.deptName || '';

    _memberSearchTerm = '';
    var searchInput = document.getElementById('rankMembersSearch');
    if (searchInput) searchInput.value = '';

    hideRankForm();
    closePromotionsPanel();

    if (!_deptId) return;
    loadRankSettings();
    loadMetricTypes();
    loadRanks();
    loadDeptMembers();
    loadPendingPromotions();
  }

  // ---------- Rank Settings (community-wide) ----------

  // loadRankSettings reads the community-wide resetStatsOnPromotion flag so the panel
  // toggle reflects the current value and progress labels read "since promotion".
  function loadRankSettings() {
    fetch(getApi() + '/api/v1/community/' + _communityId)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var community = (data && data.community) || data || {};
        var rs = community.rankSettings || {};
        _resetStatsOnPromotion = !!rs.resetStatsOnPromotion;
        syncResetStatsToggle();
      })
      .catch(function () { /* leave default (all-time) */ });
  }

  function syncResetStatsToggle() {
    var el = document.getElementById('rkmResetStatsToggle');
    if (el) el.checked = _resetStatsOnPromotion;
  }

  // setResetStatsOnPromotion persists the community-wide flag. Updates optimistically
  // so the toggle and progress labels reflect the change immediately.
  function setResetStatsOnPromotion(enabled) {
    var previous = _resetStatsOnPromotion;
    _resetStatsOnPromotion = !!enabled;
    syncResetStatsToggle();

    fetch(getApi() + '/api/v1/community/' + _communityId + '?userId=' + encodeURIComponent(_userId), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 'rankSettings.resetStatsOnPromotion': _resetStatsOnPromotion })
    })
      .then(function (r) {
        if (!r.ok) throw new Error('Failed to update setting');
        if (typeof showToast === 'function') {
          showToast(_resetStatsOnPromotion ? 'Stats now reset on promotion' : 'Stats now count all-time', 2500, 'success');
        }
        // Refresh progress so bars reflect since-promotion vs all-time.
        loadPendingPromotions().then(renderPendingPromotions).catch(function () {});
      })
      .catch(function (err) {
        console.error('Error updating rank settings:', err);
        _resetStatsOnPromotion = previous;
        syncResetStatsToggle();
        if (typeof showToast === 'function') showToast('Failed to update setting', 3000, 'error');
      });
  }

  function destroy() {
    _deptId = null;
    _ranks = [];
    _members = [];
    _metricTypes = [];
    _pendingPromotions = [];
    _memberSearchTerm = '';
    clearTimeout(_memberSearchTimer);
    if (_confettiFrame) {
      cancelAnimationFrame(_confettiFrame);
      _confettiFrame = null;
    }
    hideRankForm();
    closePromotionsPanel();
  }

  // ---------- Legacy modal wrappers ----------

  function openLegacyModal(departmentId) {
    var deptName = '';
    if (window.departmentsListData) {
      var dept = window.departmentsListData.find(function (d) { return d._id === departmentId; });
      if (dept) deptName = dept.name || '';
    }
    var overlay = document.getElementById('rankManagementModal');
    if (overlay) overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    init({ deptId: departmentId, deptName: deptName });
  }

  function closeLegacyModal() {
    var overlay = document.getElementById('rankManagementModal');
    if (overlay) overlay.classList.remove('is-open');
    document.body.style.overflow = '';
    destroy();
  }

  // ---------- Confirm dialog (prefers ddModal, falls back to edmConfirm) ----------

  function confirmDelete(rankName) {
    var safeName = escapeRankHtml(rankName);
    if (typeof window.ddModal === 'function') {
      return new Promise(function (resolve) {
        window.ddModal({
          type: 'danger',
          icon: 'fa-trash',
          title: 'Delete rank?',
          message: '<strong>' + safeName + '</strong> will be removed.',
          detail: 'Members with this rank will become unranked.',
          confirmText: 'Delete',
          confirmIcon: 'fa-trash',
          onConfirm: function () { resolve(true); },
          onCancel: function () { resolve(false); }
        });
      });
    }
    if (typeof window.edmConfirm === 'function') {
      return window.edmConfirm({
        icon: 'trash', iconBg: 'rgba(239,68,68,0.1)', iconColor: '#ef4444',
        title: 'Delete Rank?',
        text: 'Remove <strong style="color:#f1f5f9;">' + safeName + '</strong> from the hierarchy? Members with this rank will become unranked.',
        confirmLabel: 'Delete', confirmIcon: 'trash'
      });
    }
    return Promise.resolve(window.confirm('Delete rank "' + rankName + '"?'));
  }

  // ---------- Metric Types ----------

  function loadMetricTypes() {
    fetch(getApi() + '/api/v1/community/' + _communityId + '/departments/' + _deptId + '/ranks/metric-types')
      .then(function (r) { return r.json(); })
      .then(function (data) { _metricTypes = data.metricTypes || data || []; })
      .catch(function () { _metricTypes = []; });
  }

  // ---------- Ranks ----------

  function loadRanks() {
    var container = document.getElementById('ranksList');
    if (container) {
      container.innerHTML = '<div class="rkm-empty"><i class="fa fa-spinner fa-spin"></i><p>Loading ranks...</p></div>';
    }

    fetch(getApi() + '/api/v1/community/' + _communityId + '/departments/' + _deptId + '/ranks')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        _ranks = data.ranks || data || [];
        renderRanks();
        if (_members.length > 0) renderDeptMembers();
      })
      .catch(function (err) {
        console.error('Failed to load ranks:', err);
        if (container) container.innerHTML = '<div class="rkm-empty"><i class="fa fa-exclamation-triangle" style="color:#ef4444;"></i><p style="color:#ef4444;">Failed to load ranks</p></div>';
      });
  }

  function renderRanks() {
    var container = document.getElementById('ranksList');
    if (!container) return;
    if (!_ranks || _ranks.length === 0) {
      container.innerHTML = '<div class="rkm-empty"><i class="fa fa-shield"></i><p>No ranks configured yet</p></div>';
      return;
    }

    var sorted = _ranks.slice().sort(function (a, b) { return (a.displayOrder || 0) - (b.displayOrder || 0); });
    var html = '';
    sorted.forEach(function (rank, idx) {
      var tags = '';
      if (rank.prefix) tags += '<span class="rkm-rank-tag rkm-tag-prefix">' + escapeRankHtml(rank.prefix) + '</span>';
      if (rank.isDefault) tags += '<span class="rkm-rank-tag rkm-tag-default">Default</span>';
      if (rank.autoPromote) tags += '<span class="rkm-rank-tag rkm-tag-auto">Auto</span>';
      if (typeof rank.payRatePerHour === 'number' && rank.payRatePerHour > 0) {
        tags += '<span class="rkm-rank-tag rkm-tag-pay">$' + (rank.payRatePerHour / 100).toFixed(2) + '/hr</span>';
      }
      if (rank.requirements && rank.requirements.length > 0) {
        tags += '<span class="rkm-rank-tag rkm-tag-req">' + rank.requirements.length + ' req' + (rank.requirements.length > 1 ? 's' : '') + '</span>';
      }

      var isTop = idx === 0;
      var isBottom = idx === sorted.length - 1;
      var orderIcon, orderClass;
      if (isTop) {
        orderIcon = '<i class="fa fa-crown"></i>';
        orderClass = 'is-top';
      } else if (isBottom) {
        orderIcon = '<i class="fa fa-angle-double-down"></i>';
        orderClass = 'is-bottom';
      } else {
        orderIcon = '<i class="fa fa-minus" style="font-size:0.5rem;"></i>';
        orderClass = '';
      }

      html += '<div class="rkm-rank" data-rank-id="' + rank._id + '">' +
        '<div class="rkm-rank-order">' +
          '<div class="rkm-rank-order-icon ' + orderClass + '">' + orderIcon + '</div>' +
          '<div class="rkm-rank-order-line"></div>' +
        '</div>' +
        '<div class="rkm-rank-info">' +
          '<div class="rkm-rank-name">' + escapeRankHtml(rank.name) + '</div>' +
          (tags ? '<div class="rkm-rank-meta">' + tags + '</div>' : '') +
        '</div>' +
        '<div class="rkm-rank-actions">' +
          (idx > 0 ? '<button class="rkm-rank-btn rkm-rank-btn-move" onclick="event.stopPropagation(); moveRank(\'' + rank._id + '\', -1)" title="Move up"><i class="fa fa-chevron-up"></i></button>' : '') +
          (idx < sorted.length - 1 ? '<button class="rkm-rank-btn rkm-rank-btn-move" onclick="event.stopPropagation(); moveRank(\'' + rank._id + '\', 1)" title="Move down"><i class="fa fa-chevron-down"></i></button>' : '') +
          '<button class="rkm-rank-btn rkm-rank-btn-edit" onclick="event.stopPropagation(); editRank(\'' + rank._id + '\')" title="Edit"><i class="fa fa-pencil"></i></button>' +
          '<button class="rkm-rank-btn rkm-rank-btn-del" onclick="event.stopPropagation(); deleteRank(\'' + rank._id + '\')" title="Delete"><i class="fa fa-trash"></i></button>' +
        '</div>' +
      '</div>';
    });
    container.innerHTML = html;
  }

  // ---------- Department Members ----------

  function isDeptPublic() {
    if (window.departmentsListData && _deptId) {
      var dept = window.departmentsListData.find(function (d) { return d._id === _deptId; });
      if (dept) return !dept.approvalRequired;
    }
    return false;
  }

  function loadDeptMembers(page) {
    page = page || 1;
    _membersPage = page;
    var container = document.getElementById('rankMembersList');
    if (container) container.innerHTML = '<div class="rkm-empty"><i class="fa fa-spinner fa-spin"></i><p>Loading members...</p></div>';
    if (!_deptId) return;

    if (isDeptPublic()) {
      var communityUrl;
      if (_memberSearchTerm) {
        communityUrl = getApi() + '/api/v1/community/' + _communityId + '/members/search?q=' + encodeURIComponent(_memberSearchTerm) + '&page=' + page + '&limit=' + _membersLimit;
      } else {
        communityUrl = getApi() + '/api/v2/community/' + _communityId + '/members?page=' + page + '&limit=' + _membersLimit;
      }
      var deptUrl = getApi() + '/api/v1/community/' + _communityId + '/departments/' + _deptId + '/members?page=1&limit=9999';

      Promise.all([
        fetch(communityUrl).then(function (r) { return r.json(); }),
        fetch(deptUrl).then(function (r) { return r.json(); })
      ])
      .then(function (results) {
        var communityData = results[0];
        var deptData = results[1];

        var deptRankMap = {};
        (deptData.data || []).forEach(function (m) {
          if (m.rankId) deptRankMap[m._id] = m.rankId;
        });

        var communityMembers = communityData.members || [];
        var pagination = communityData.pagination || {};
        var totalCount = pagination.totalCount || communityMembers.length;
        _membersTotalPages = Math.ceil(totalCount / _membersLimit) || 1;

        if (communityMembers.length === 0 && page === 1) {
          var msg = _memberSearchTerm
            ? 'No members match "' + escapeRankHtml(_memberSearchTerm) + '"'
            : 'No community members found.';
          if (container) container.innerHTML = '<div class="rkm-empty"><i class="fa fa-' + (_memberSearchTerm ? 'search' : 'users') + '" style="color:#4a5568;"></i><p>' + msg + '</p></div>';
          return;
        }

        _members = communityMembers.map(function (m) {
          var id = m.id || m._id;
          return {
            userID: id,
            rankId: deptRankMap[id] || '',
            username: m.username || 'Unknown',
            profilePicture: m.profilePicture || ''
          };
        });

        renderDeptMembers();
      })
      .catch(function (err) {
        console.error('Failed to load members:', err);
        if (container) container.innerHTML = '<div class="rkm-empty"><i class="fa fa-exclamation-triangle" style="color:#ef4444;"></i><p style="color:#ef4444;">Failed to load members</p></div>';
      });
      return;
    }

    // Private department: fetch department members directly
    var url = getApi() + '/api/v1/community/' + _communityId + '/departments/' + _deptId + '/members?page=' + page + '&limit=' + _membersLimit;
    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var deptMembers = data.data || [];
        var totalCount = data.totalCount || 0;
        _membersTotalPages = Math.ceil(totalCount / _membersLimit) || 1;

        if (deptMembers.length === 0 && page === 1) {
          if (container) container.innerHTML = '<div class="rkm-empty"><i class="fa fa-user-plus" style="color:#4a5568;"></i><p>No members in this department.<br><span style="color:#64748b; font-size:0.7rem;">Add members from the Edit Department modal first.</span></p></div>';
          return;
        }

        _members = deptMembers.map(function (m) {
          var user = m.user || {};
          return {
            userID: m._id || user.userID,
            rankId: m.rankId || '',
            username: user.username || m._id || 'Unknown',
            profilePicture: user.profilePicture || ''
          };
        });

        if (_memberSearchTerm) {
          var term = _memberSearchTerm.toLowerCase();
          _members = _members.filter(function (m) {
            return (m.username || '').toLowerCase().indexOf(term) !== -1;
          });
          if (_members.length === 0) {
            if (container) container.innerHTML = '<div class="rkm-empty"><i class="fa fa-search"></i><p>No members match "' + escapeRankHtml(_memberSearchTerm) + '"</p></div>';
            return;
          }
        }

        renderDeptMembers();
      })
      .catch(function (err) {
        console.error('Failed to load members:', err);
        if (container) container.innerHTML = '<div class="rkm-empty"><i class="fa fa-exclamation-triangle" style="color:#ef4444;"></i><p style="color:#ef4444;">Failed to load members</p></div>';
      });
  }

  function renderDeptMembers() {
    var container = document.getElementById('rankMembersList');
    if (!container) return;
    if (!_members || _members.length === 0) {
      container.innerHTML = '<div class="rkm-empty"><i class="fa fa-users"></i><p>No members</p></div>';
      return;
    }

    var sorted = _ranks.slice().sort(function (a, b) { return (a.displayOrder || 0) - (b.displayOrder || 0); });
    var defaultRank = sorted.find(function (r) { return r.isDefault; });

    var html = '';
    _members.forEach(function (member) {
      var effectiveRankId = member.rankId || (defaultRank ? defaultRank._id : '');
      var optionsHtml = '<option value="">Unranked</option>';
      sorted.forEach(function (r) {
        var selected = (r._id === effectiveRankId) ? ' selected' : '';
        optionsHtml += '<option value="' + escapeRankHtml(r._id) + '"' + selected + '>' + escapeRankHtml(r.name) + (r.prefix ? ' (' + escapeRankHtml(r.prefix) + ')' : '') + '</option>';
      });

      var avatarHtml = member.profilePicture
        ? '<img class="rkm-member-avatar" src="' + escapeRankHtml(member.profilePicture) + '">'
        : '<div class="rkm-member-initial">' + escapeRankHtml((member.username || '?').charAt(0).toUpperCase()) + '</div>';

      html += '<div class="rkm-member">' +
        avatarHtml +
        '<span class="rkm-member-name">' + escapeRankHtml(member.username) + '</span>' +
        '<select data-userid="' + escapeRankHtml(member.userID) + '" onchange="assignRankToMember(\'' + escapeRankHtml(member.userID) + '\', this.value, this)">' +
          optionsHtml +
        '</select>' +
      '</div>';
    });

    if (_membersTotalPages > 1) {
      html += '<div class="rkm-members-pagination">' +
        '<button class="rkm-page-btn" onclick="loadDeptMembers(' + (_membersPage - 1) + ')" ' + (_membersPage <= 1 ? 'disabled' : '') + '><i class="fa fa-chevron-left"></i></button>' +
        '<span class="rkm-page-info">' + _membersPage + ' / ' + _membersTotalPages + '</span>' +
        '<button class="rkm-page-btn" onclick="loadDeptMembers(' + (_membersPage + 1) + ')" ' + (_membersPage >= _membersTotalPages ? 'disabled' : '') + '><i class="fa fa-chevron-right"></i></button>' +
      '</div>';
    }

    container.innerHTML = html;
  }

  function filterRankMembers(query) {
    _memberSearchTerm = (query || '').trim();
    clearTimeout(_memberSearchTimer);
    _memberSearchTimer = setTimeout(function () { loadDeptMembers(1); }, 300);
  }

  function assignRankToMember(userId, rankId, selectEl) {
    if (_assignInFlight[userId]) return;
    _assignInFlight[userId] = true;

    var member = _members.find(function (m) { return m.userID === userId; });
    var previousRankId = member ? member.rankId : '';

    if (selectEl) selectEl.disabled = true;

    fetch(getApi() + '/api/v1/community/' + _communityId + '/departments/' + _deptId + '/members/' + userId + '/rank?userId=' + _userId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rankId: rankId })
    })
      .then(function (r) {
        if (!r.ok) throw new Error('Failed to assign rank');
        return r.json();
      })
      .then(function () {
        if (typeof showToast === 'function') showToast('Rank assigned', 2000, 'success');
        if (member) member.rankId = rankId;
        if (selectEl) selectEl.disabled = false;
      })
      .catch(function (err) {
        console.error('Error assigning rank:', err);
        if (typeof showToast === 'function') showToast('Failed to assign rank', 3000, 'error');
        else window.alert('Failed to assign rank');
        if (member) member.rankId = previousRankId;
        renderDeptMembers();
      })
      .finally(function () {
        delete _assignInFlight[userId];
      });
  }

  // ---------- Rank Form ----------

  function showRankForm(rank) {
    var formEl = document.getElementById('rankFormContainer');
    var backdrop = document.getElementById('rankFormBackdrop');
    if (!formEl || !backdrop) return;
    formEl.classList.add('is-open');
    backdrop.classList.add('is-open');
    document.getElementById('rankFormId').value = (rank && rank._id) ? rank._id : '';
    document.getElementById('rankFormName').value = (rank && rank.name) || '';
    document.getElementById('rankFormPrefix').value = (rank && rank.prefix) || '';
    document.getElementById('rankFormAutoPromote').checked = (rank && rank.autoPromote) || false;
    document.getElementById('rankFormIsDefault').checked = (rank && rank.isDefault) || false;
    var payCents = (rank && typeof rank.payRatePerHour === 'number') ? rank.payRatePerHour : 0;
    document.getElementById('rankFormPayRate').value = payCents > 0 ? (payCents / 100).toFixed(2) : '';
    var titleEl = document.getElementById('rankFormTitle');
    titleEl.innerHTML = (rank && rank._id)
      ? '<i class="fa fa-pencil"></i> <span>Edit Rank</span>'
      : '<i class="fa fa-plus"></i> <span>New Rank</span>';

    var reqList = document.getElementById('rankRequirementsList');
    reqList.innerHTML = '';
    if (rank && rank.requirements && rank.requirements.length > 0) {
      rank.requirements.forEach(function (req) {
        addRequirementRow(req.metricType || req.metric, req.threshold, req.customLabel, req.id);
      });
    }

    setTimeout(function () {
      var nameEl = document.getElementById('rankFormName');
      if (nameEl) nameEl.focus();
    }, 100);
  }

  function hideRankForm() {
    var formEl = document.getElementById('rankFormContainer');
    var backdrop = document.getElementById('rankFormBackdrop');
    if (formEl) formEl.classList.remove('is-open');
    if (backdrop) backdrop.classList.remove('is-open');
  }

  function addRequirementRow(metricType, threshold, customLabel, requirementId) {
    var container = document.getElementById('rankRequirementsList');
    if (!container) return;
    var row = document.createElement('div');
    row.className = 'rkm-req-row';
    if (requirementId) row.setAttribute('data-requirement-id', requirementId);

    var isCustom = metricType === 'custom';

    var selectHtml = '<select class="rank-req-metric" onchange="window._onReqMetricChange(this)">';
    selectHtml += '<option value="">Select metric...</option>';
    if (_metricTypes && _metricTypes.length > 0) {
      _metricTypes.forEach(function (mt) {
        var val = mt.type || mt.value || mt.name || mt;
        var label = mt.displayName || mt.label || mt.name || mt;
        var selected = (val === metricType) ? ' selected' : '';
        selectHtml += '<option value="' + escapeRankHtml(val) + '"' + selected + '>' + escapeRankHtml(label) + '</option>';
      });
    }
    selectHtml += '<option value="custom"' + (isCustom ? ' selected' : '') + ' style="border-top:1px solid rgba(124,58,237,0.2); font-style:italic;">Custom Requirement</option>';
    selectHtml += '</select>';

    row.innerHTML = selectHtml +
      '<input type="text" class="rank-req-custom-label" placeholder="e.g. Be on server 4 hours" value="' + escapeRankHtml(customLabel || '') + '" style="display:' + (isCustom ? 'block' : 'none') + ';">' +
      '<input type="number" class="rank-req-threshold" placeholder="e.g. 50" value="' + (threshold || '') + '" min="0" style="display:' + (isCustom ? 'none' : 'block') + ';">' +
      '<button type="button" class="rkm-req-del" onclick="this.parentElement.remove()"><i class="fa fa-times"></i></button>';

    container.appendChild(row);
  }

  function onReqMetricChange(selectEl) {
    var row = selectEl.closest('.rkm-req-row');
    if (!row) return;
    var thresholdInput = row.querySelector('.rank-req-threshold');
    var customInput = row.querySelector('.rank-req-custom-label');
    if (selectEl.value === 'custom') {
      thresholdInput.style.display = 'none';
      customInput.style.display = 'block';
      customInput.focus();
    } else {
      thresholdInput.style.display = 'block';
      customInput.style.display = 'none';
    }
  }

  function saveRank() {
    var name = document.getElementById('rankFormName').value.trim();
    if (!name) {
      if (typeof showToast === 'function') showToast('Rank name is required', 2500, 'error');
      else window.alert('Rank name is required');
      return;
    }

    var requirements = [];
    document.querySelectorAll('#rankRequirementsList > div').forEach(function (row) {
      var metric = row.querySelector('.rank-req-metric').value;
      var reqId = row.getAttribute('data-requirement-id') || '';
      if (metric === 'custom') {
        var label = row.querySelector('.rank-req-custom-label').value.trim();
        if (label) {
          var req = { metricType: 'custom', threshold: 0, customLabel: label };
          if (reqId) req.id = reqId;
          requirements.push(req);
        }
      } else {
        var threshold = parseInt(row.querySelector('.rank-req-threshold').value, 10) || 0;
        if (metric && threshold > 0) {
          var req2 = { metricType: metric, threshold: threshold };
          if (reqId) req2.id = reqId;
          requirements.push(req2);
        }
      }
    });

    var payDollars = parseFloat(document.getElementById('rankFormPayRate').value);
    var payCents = isFinite(payDollars) && payDollars > 0 ? Math.round(payDollars * 100) : 0;

    var payload = {
      name: name,
      prefix: document.getElementById('rankFormPrefix').value.trim(),
      autoPromote: document.getElementById('rankFormAutoPromote').checked,
      canViewStats: true,
      isDefault: document.getElementById('rankFormIsDefault').checked,
      payRatePerHour: payCents,
      requirements: requirements
    };

    var rankId = document.getElementById('rankFormId').value;
    var url, method;
    if (rankId) {
      url = getApi() + '/api/v1/community/' + _communityId + '/departments/' + _deptId + '/ranks/' + rankId;
      method = 'PUT';
    } else {
      url = getApi() + '/api/v1/community/' + _communityId + '/departments/' + _deptId + '/ranks';
      method = 'POST';
    }

    fetch(url + (url.indexOf('?') === -1 ? '?' : '&') + 'userId=' + _userId, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) {
        if (!r.ok) throw new Error('Failed to save rank');
        return r.json();
      })
      .then(function () {
        if (typeof showToast === 'function') showToast(rankId ? 'Rank updated' : 'Rank created', 2500, 'success');
        hideRankForm();
        loadRanks();
      })
      .catch(function (err) {
        console.error('Error saving rank:', err);
        if (typeof showToast === 'function') showToast('Failed to save rank', 3000, 'error');
        else window.alert('Failed to save rank');
      });
  }

  function editRank(rankId) {
    var rank = _ranks.find(function (r) { return r._id === rankId; });
    if (rank) showRankForm(rank);
  }

  async function deleteRank(rankId) {
    var rank = _ranks.find(function (r) { return r._id === rankId; });
    var rankName = rank ? rank.name : 'this rank';
    var confirmed = await confirmDelete(rankName);
    if (!confirmed) return;

    fetch(getApi() + '/api/v1/community/' + _communityId + '/departments/' + _deptId + '/ranks/' + rankId + '?userId=' + _userId, {
      method: 'DELETE'
    })
      .then(function (r) {
        if (!r.ok) throw new Error('Failed to delete rank');
        if (typeof showToast === 'function') showToast('Rank deleted', 2500, 'success');
        loadRanks();
      })
      .catch(function (err) {
        console.error('Error deleting rank:', err);
        if (typeof showToast === 'function') showToast('Failed to delete rank', 3000, 'error');
        else window.alert('Failed to delete rank');
      });
  }

  function moveRank(rankId, direction) {
    var sorted = _ranks.slice().sort(function (a, b) { return (a.displayOrder || 0) - (b.displayOrder || 0); });
    var idx = sorted.findIndex(function (r) { return r._id === rankId; });
    if (idx < 0) return;
    var newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= sorted.length) return;

    var temp = sorted[idx];
    sorted[idx] = sorted[newIdx];
    sorted[newIdx] = temp;

    var orderedIds = sorted.map(function (r) { return r._id; });

    fetch(getApi() + '/api/v1/community/' + _communityId + '/departments/' + _deptId + '/ranks/reorder?userId=' + _userId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rankIds: orderedIds })
    })
      .then(function (r) {
        if (!r.ok) throw new Error('Failed to reorder');
        loadRanks();
      })
      .catch(function (err) {
        console.error('Error reordering ranks:', err);
        if (typeof showToast === 'function') showToast('Failed to reorder ranks', 3000, 'error');
      });
  }

  // ---------- Pending Promotions ----------

  function loadPendingPromotions() {
    if (!_deptId) return Promise.resolve();
    return fetch(getApi() + '/api/v1/community/' + _communityId + '/departments/' + _deptId + '/pending-promotions')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        _pendingPromotions = data.pending || [];
        var count = _pendingPromotions.length;
        var banner = document.getElementById('rkmPromoBanner');
        var countEl = document.getElementById('rkmPromoCount');
        var subtext = document.getElementById('rkmPromoBannerSubtext');
        if (countEl) countEl.textContent = count;
        if (subtext) subtext.textContent = count === 1 ? '1 member ready for review' : count + ' members ready for review';
        if (banner) {
          if (count > 0) banner.classList.add('has-pending');
          else banner.classList.remove('has-pending');
        }
        syncExternalBadges(count);
        return count;
      })
      .catch(function () {
        _pendingPromotions = [];
        var banner = document.getElementById('rkmPromoBanner');
        if (banner) banner.classList.remove('has-pending');
        return 0;
      });
  }

  // Keep the edit-department card badge and any other consumers' counts in sync
  // whenever the rank module observes a fresh pending-promotions count.
  function syncExternalBadges(count) {
    var edmBadge = document.getElementById('edmRanksBadge');
    var edmBadgeCount = document.getElementById('edmRanksBadgeCount');
    if (edmBadge && edmBadgeCount) {
      if (count > 0) {
        edmBadgeCount.textContent = count;
        edmBadge.classList.add('has-count');
      } else {
        edmBadge.classList.remove('has-count');
      }
    }
    if (window.pendingPromoCounts && _deptId) {
      window.pendingPromoCounts[_deptId] = count;
    }
    if (typeof window.onPendingPromotionsCountChange === 'function') {
      try { window.onPendingPromotionsCountChange(_deptId, count); } catch (e) { /* ignore */ }
    }
  }

  function openPromotionsPanel() {
    var backdrop = document.getElementById('rkmPromoBackdrop');
    var panel = document.getElementById('rkmPromoPanel');
    if (!backdrop || !panel) return;
    backdrop.classList.add('is-open');
    panel.classList.add('is-open');
    renderPendingPromotions();
    loadPendingPromotions().then(renderPendingPromotions).catch(function () {});
  }

  function closePromotionsPanel() {
    var backdrop = document.getElementById('rkmPromoBackdrop');
    var panel = document.getElementById('rkmPromoPanel');
    if (backdrop) backdrop.classList.remove('is-open');
    if (panel) panel.classList.remove('is-open');
  }

  function renderPendingPromotions() {
    var container = document.getElementById('rkmPromoList');
    if (!container) return;
    if (!_pendingPromotions || _pendingPromotions.length === 0) {
      container.innerHTML = '<div class="rkm-empty" style="padding:3rem 1rem;"><i class="fa fa-check-circle" style="color:#34d399; font-size:2rem;"></i><p style="color:#94a3b8; margin-top:0.5rem;">All caught up! No pending promotions.</p></div>';
      return;
    }

    var html = '';
    _pendingPromotions.forEach(function (p) {
      var avatarHtml = p.profilePicture
        ? '<img class="rkm-promo-card-avatar" src="' + escapeRankHtml(p.profilePicture) + '">'
        : '<div class="rkm-promo-card-initial">' + escapeRankHtml((p.username || '?').charAt(0).toUpperCase()) + '</div>';

      var fromRank = p.currentRank ? escapeRankHtml(p.currentRank.name) : 'Unranked';
      var toRank = p.nextRank ? escapeRankHtml(p.nextRank.name) : '—';

      var metricsHtml = '';
      if (p.progress && p.progress.length > 0) {
        metricsHtml = '<div class="rkm-promo-metrics">';
        if (_resetStatsOnPromotion) {
          metricsHtml += '<div class="rkm-promo-since-note" style="font-size:0.6rem; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">' +
            '<i class="fa fa-rotate-left" style="margin-right:4px;"></i>Progress since last promotion</div>';
        }
        p.progress.forEach(function (prog) {
          if (prog.isCustom) {
            var toggleId = 'customReqToggle_' + escapeRankHtml(p.userId) + '_' + escapeRankHtml(prog.requirementId || '');
            var checkedAttr = prog.met ? ' checked' : '';
            metricsHtml +=
              '<div class="rkm-promo-metric" style="display:flex; align-items:center; gap:8px;">' +
                '<label style="display:flex; align-items:center; gap:6px; cursor:pointer; flex:1; margin:0;">' +
                  '<input type="checkbox" id="' + toggleId + '"' + checkedAttr +
                    ' onchange="window.toggleCustomReq(\'' + escapeRankHtml(p.userId) + '\', \'' + escapeRankHtml(prog.requirementId || '') + '\', this.checked)"' +
                    ' style="accent-color:#7c3aed; width:14px; height:14px; cursor:pointer;">' +
                  '<span class="rkm-promo-metric-name" style="font-style:italic; color:' + (prog.met ? '#c8c6d8' : '#64748b') + ';">' + escapeRankHtml(prog.customLabel || prog.displayName) + '</span>' +
                '</label>' +
                '<span style="font-size:0.6rem; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">Manual</span>' +
              '</div>';
          } else {
            var pct = Math.min(Math.round((prog.percentage || 0) * 100), 100);
            // In reset mode, show the lifetime total alongside the since-promotion count.
            var allTimeSuffix = '';
            if (_resetStatsOnPromotion && typeof prog.allTimeValue === 'number') {
              allTimeSuffix = '<span class="rkm-promo-metric-alltime" style="color:#64748b; font-weight:400;"> · ' + prog.allTimeValue + ' all-time</span>';
            }
            metricsHtml +=
              '<div class="rkm-promo-metric">' +
                '<div class="rkm-promo-metric-header">' +
                  '<span class="rkm-promo-metric-name">' + escapeRankHtml(prog.displayName || prog.metricType) + '</span>' +
                  '<span class="rkm-promo-metric-val">' + prog.currentValue + ' / ' + prog.threshold + ' <i class="fa fa-check" style="font-size:0.55rem;"></i>' + allTimeSuffix + '</span>' +
                '</div>' +
                '<div class="rkm-promo-bar"><div class="rkm-promo-bar-fill" style="width:' + pct + '%"></div></div>' +
              '</div>';
          }
        });
        metricsHtml += '</div>';
      }

      var hasUnmetCustom = (p.progress || []).some(function (prog) { return prog.isCustom && !prog.met; });
      var promoteBtn;
      if (hasUnmetCustom) {
        promoteBtn = '<button class="rkm-btn-promote" disabled style="opacity:0.5; cursor:not-allowed;" title="Complete all custom requirements first">' +
          '<i class="fa fa-lock"></i> Complete custom requirements first' +
        '</button>';
      } else {
        promoteBtn = '<button class="rkm-btn-promote" onclick="promoteOfficer(\'' + escapeRankHtml(p.userId) + '\', \'' + escapeRankHtml(p.nextRank ? p.nextRank._id : '') + '\', this)">' +
          '<i class="fa fa-arrow-up"></i> Promote to ' + toRank +
        '</button>';
      }

      html +=
        '<div class="rkm-promo-card" id="promoCard_' + escapeRankHtml(p.userId) + '">' +
          '<div class="rkm-promo-card-header">' +
            avatarHtml +
            '<div class="rkm-promo-card-info">' +
              '<div class="rkm-promo-card-name">' + escapeRankHtml(p.username) + '</div>' +
              '<div class="rkm-promo-card-ranks">' +
                '<span class="from">' + fromRank + '</span>' +
                '<span class="arrow"><i class="fa fa-arrow-right"></i></span>' +
                '<span class="to">' + toRank + '</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          metricsHtml +
          promoteBtn +
        '</div>';
    });

    container.innerHTML = html;
  }

  function promoteOfficer(userId, nextRankId, btnEl) {
    if (!nextRankId) return;
    btnEl.disabled = true;
    btnEl.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Promoting...';

    fetch(getApi() + '/api/v1/community/' + _communityId + '/departments/' + _deptId + '/members/' + userId + '/rank?userId=' + _userId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rankId: nextRankId })
    })
      .then(function (r) {
        if (!r.ok) throw new Error('Failed to promote');
        return r.json();
      })
      .then(function () {
        launchConfetti();

        var card = document.getElementById('promoCard_' + userId);
        if (card) {
          btnEl.innerHTML = '<i class="fa fa-check"></i> Promoted!';
          btnEl.style.background = 'linear-gradient(135deg, #10b981, #059669)';
          btnEl.style.boxShadow = '0 2px 8px rgba(16,185,129,0.3)';
          setTimeout(function () {
            card.style.transition = 'all 0.4s ease';
            card.style.opacity = '0';
            card.style.transform = 'translateX(30px) scale(0.95)';
            card.style.maxHeight = card.offsetHeight + 'px';
            card.style.overflow = 'hidden';
            setTimeout(function () {
              card.style.maxHeight = '0';
              card.style.padding = '0';
              card.style.margin = '0';
              card.style.borderWidth = '0';
            }, 200);
          }, 800);
        }

        if (typeof showToast === 'function') showToast('Member promoted!', 3000, 'success');

        loadRanks();
        loadDeptMembers();
        _pendingPromotions = _pendingPromotions.filter(function (p) { return p.userId !== userId; });
        var count = _pendingPromotions.length;
        var countEl = document.getElementById('rkmPromoCount');
        var subtext = document.getElementById('rkmPromoBannerSubtext');
        if (countEl) countEl.textContent = count;
        if (subtext) subtext.textContent = count === 1 ? '1 member ready for review' : count + ' members ready for review';
        syncExternalBadges(count);

        if (count === 0) {
          var banner = document.getElementById('rkmPromoBanner');
          if (banner) banner.classList.remove('has-pending');
          setTimeout(function () { renderPendingPromotions(); }, 1200);
        }
      })
      .catch(function (err) {
        console.error('Error promoting officer:', err);
        btnEl.disabled = false;
        btnEl.innerHTML = '<i class="fa fa-arrow-up"></i> Retry Promote';
        if (typeof showToast === 'function') showToast('Failed to promote member', 3000, 'error');
      });
  }

  function toggleCustomReq(userId, requirementId, met) {
    var pending = _pendingPromotions.find(function (p) { return p.userId === userId; });
    var prog = pending && (pending.progress || []).find(function (pr) { return pr.isCustom && pr.requirementId === requirementId; });
    var previousMet = prog ? !!prog.met : null;
    if (prog) {
      prog.met = met;
      prog.currentValue = met ? 1 : 0;
      prog.percentage = met ? 1.0 : 0.0;
      renderPendingPromotions();
    }

    fetch(getApi() + '/api/v1/community/' + _communityId + '/departments/' + _deptId + '/members/' + userId + '/custom-requirements/' + requirementId + '?userId=' + _userId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ met: met })
    })
      .then(function (r) {
        if (!r.ok) throw new Error('Failed to toggle custom requirement');
        if (typeof showToast === 'function') showToast(met ? 'Requirement marked as met' : 'Requirement unmarked', 2000, 'success');
      })
      .catch(function (err) {
        console.error('Error toggling custom requirement:', err);
        if (typeof showToast === 'function') showToast('Failed to update requirement', 2500, 'error');
        if (prog && previousMet !== null) {
          prog.met = previousMet;
          prog.currentValue = previousMet ? 1 : 0;
          prog.percentage = previousMet ? 1.0 : 0.0;
          renderPendingPromotions();
        }
      });
  }

  // ---------- Confetti ----------

  function launchConfetti() {
    var canvas = document.getElementById('rkmConfettiCanvas');
    var card = document.querySelector('[data-rkm-root]') || document.querySelector('.rkm-card');
    if (!canvas || !card) return;
    canvas.width = card.offsetWidth;
    canvas.height = card.offsetHeight;
    var ctx = canvas.getContext('2d');
    var particles = [];
    var colors = ['#fbbf24', '#f59e0b', '#34d399', '#a78bfa', '#f87171', '#60a5fa', '#fb923c', '#e879f9'];

    for (var i = 0; i < 80; i++) {
      particles.push({
        x: canvas.width * 0.5 + (Math.random() - 0.5) * 100,
        y: canvas.height * 0.4,
        vx: (Math.random() - 0.5) * 12,
        vy: Math.random() * -14 - 4,
        w: Math.random() * 8 + 4,
        h: Math.random() * 4 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 15,
        gravity: 0.35 + Math.random() * 0.15,
        opacity: 1,
        decay: 0.008 + Math.random() * 0.008
      });
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var alive = false;
      particles.forEach(function (p) {
        if (p.opacity <= 0) return;
        alive = true;
        p.x += p.vx;
        p.vy += p.gravity;
        p.y += p.vy;
        p.vx *= 0.98;
        p.rotation += p.rotSpeed;
        p.opacity -= p.decay;
        if (p.opacity <= 0) return;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation * Math.PI / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (alive) {
        _confettiFrame = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        _confettiFrame = null;
      }
    }
    animate();

    setTimeout(function () {
      if (_confettiFrame) cancelAnimationFrame(_confettiFrame);
      _confettiFrame = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, 3000);
  }

  // ---------- External utility: lightweight pending-count fetch ----------
  // Used by surfaces that want the badge count without mounting the full UI
  // (e.g. the edit-department modal's manage-ranks card, the dd-settings
  // sidebar badge).
  function fetchPendingCount(deptId) {
    var communityId = _communityId;
    if (!communityId || !deptId) return Promise.resolve(0);
    return fetch(getApi() + '/api/v1/community/' + communityId + '/departments/' + deptId + '/pending-promotions')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return 0;
        if (typeof data.count === 'number') return data.count;
        if (Array.isArray(data.pending)) return data.pending.length;
        return 0;
      })
      .catch(function () { return 0; });
  }

  // ---------- Public API ----------

  window.manageRanks = {
    configure: configure,
    init: init,
    destroy: destroy,
    openLegacyModal: openLegacyModal,
    closeLegacyModal: closeLegacyModal,
    fetchPendingCount: fetchPendingCount,
    reload: function () { if (_deptId) { loadRanks(); loadDeptMembers(); loadPendingPromotions(); } }
  };

  // ---------- Global handlers used by inline onclick in the partial ----------
  // These must remain global because the partial's markup uses inline handlers.
  window.openRankManagementModal = openLegacyModal;
  window.closeRankManagementModal = closeLegacyModal;
  window.showRankForm = showRankForm;
  window.hideRankForm = hideRankForm;
  window.addRequirementRow = addRequirementRow;
  window._onReqMetricChange = onReqMetricChange;
  window.saveRank = saveRank;
  window.editRank = editRank;
  window.deleteRank = deleteRank;
  window.moveRank = moveRank;
  window.assignRankToMember = assignRankToMember;
  window.filterRankMembers = filterRankMembers;
  window.loadDeptMembers = loadDeptMembers;
  window.openPromotionsPanel = openPromotionsPanel;
  window.closePromotionsPanel = closePromotionsPanel;
  window.promoteOfficer = promoteOfficer;
  window.toggleCustomReq = toggleCustomReq;
  window.setResetStatsOnPromotion = setResetStatsOnPromotion;
})();
