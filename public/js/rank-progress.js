/**
 * Shared rank progress, promotion/demotion modal logic.
 * Expects globals: API_URL, dbUser, and one of: departmentId / window.currentDepartmentId / window.ddConfig
 */

function _getRankConfig() {
  var cfg = window.ddConfig || {};
  var apiUrl = (typeof API_URL !== 'undefined' && API_URL) ? API_URL : cfg.API_URL;
  var user = (typeof dbUser !== 'undefined' && dbUser) ? dbUser : cfg.dbUser;
  var deptId = (typeof departmentId !== 'undefined' && departmentId && departmentId !== 'undefined')
    ? departmentId
    : (window.currentDepartmentId || cfg.departmentId || null);
  return { apiUrl: apiUrl, user: user, deptId: deptId };
}

function loadMyRankProgress() {
  var cfg = _getRankConfig();
  if (!cfg.apiUrl || !cfg.user || !cfg.deptId) return;
  var communityId = cfg.user.user?.lastAccessedCommunity?.communityID;
  if (!communityId) return;

  var progressUrl = cfg.apiUrl + '/api/v1/community/' + communityId + '/departments/' + cfg.deptId + '/members/' + cfg.user._id + '/rank-progress';
  var ranksUrl = cfg.apiUrl + '/api/v1/community/' + communityId + '/departments/' + cfg.deptId + '/ranks';

  Promise.all([
    fetch(progressUrl).then(function(r) { if (!r.ok) throw new Error('Rank progress not available'); return r.json(); }),
    fetch(ranksUrl).then(function(r) { if (!r.ok) return { ranks: [] }; return r.json(); }).catch(function() { return { ranks: [] }; })
  ])
    .then(function(results) {
      var data = results[0];
      var allRanks = results[1].ranks || [];
      renderRankProgress(data, allRanks);
    })
    .catch(function(err) {
      // Silently ignore - ranks may not be configured for this department
      console.debug('Rank progress not available:', err.message);
    });
}

function renderRankProgress(data, allRanks) {
  var currentRank = data.currentRank;
  var nextRank = data.nextRank;
  var metrics = data.metrics || [];
  var progress = data.progress || [];
  // When the community resets stats on promotion, currentValue counts from the
  // member's last promotion rather than all-time — label it and show the
  // lifetime figure for context (mirrors the admin Manage Ranks panel).
  var resetStatsOnPromotion = !!data.resetStatsOnPromotion;
  allRanks = allRanks || [];

  if (!currentRank) return; // No rank system configured

  // Show sidebar badge
  var badgeEl = document.getElementById('sidebar-rank-badge');
  var textEl = document.getElementById('sidebar-rank-text');
  if (badgeEl && textEl) {
    textEl.textContent = (currentRank.prefix ? currentRank.prefix + ' ' : '') + currentRank.name;
    badgeEl.style.display = 'block';
  }

  // Show stats card
  var card = document.getElementById('myRankStatsCard');
  if (!card) return;
  card.style.display = 'block';

  // Current rank info
  document.getElementById('myRankName').textContent = currentRank.name;
  var prefixEl = document.getElementById('myRankPrefix');
  if (currentRank.prefix) {
    prefixEl.textContent = currentRank.prefix;
    prefixEl.style.display = 'inline-block';
  }

  // Next rank info
  if (nextRank) {
    var nextInfo = document.getElementById('nextRankInfo');
    nextInfo.style.display = 'block';
    document.getElementById('nextRankName').textContent = nextRank.name;
    var promoTypeEl = document.getElementById('nextRankPromoType');
    if (promoTypeEl) {
      promoTypeEl.style.display = 'inline-flex';
      if (nextRank.autoPromote) {
        promoTypeEl.innerHTML = '<span style="display:inline-flex; align-items:center; gap:4px; background:rgba(16,185,129,0.12); color:#34d399; padding:2px 8px; border-radius:4px; font-size:10px; font-weight:600; letter-spacing:0.3px;"><i class="fa fa-bolt" style="font-size:9px;"></i> Auto Promotion</span>';
      } else {
        promoTypeEl.innerHTML = '<span style="display:inline-flex; align-items:center; gap:4px; background:rgba(251,191,36,0.12); color:#fbbf24; padding:2px 8px; border-radius:4px; font-size:10px; font-weight:600; letter-spacing:0.3px;"><i class="fa fa-user-check" style="font-size:9px;"></i> Admin Review</span>';
      }
    }
  }

  // Progress bars
  var barsContainer = document.getElementById('rankProgressBars');
  if (progress.length > 0) {
    var barsHtml = '';
    progress.forEach(function(p) {
      if (p.isCustom) {
        // Custom requirement: show as check/uncheck item (no progress bar)
        var icon = p.met
          ? '<i class="fa fa-check-circle" style="color:#34d399; font-size:15px;"></i>'
          : '<i class="fa fa-circle-o" style="color:#4a5568; font-size:15px;"></i>';
        var textColor = p.met ? '#c8c6d8' : '#64748b';
        var strikeStyle = p.met ? 'text-decoration:line-through; text-decoration-color:rgba(52,211,153,0.3);' : '';
        barsHtml += '<div style="display:flex; align-items:center; gap:10px; padding:2px 0;">' +
          icon +
          '<span style="color:' + textColor + '; font-size:14px; font-weight:500; font-style:italic; ' + strikeStyle + '">' + escapeHtmlRank(p.customLabel || p.displayName) + '</span>' +
        '</div>';
      } else {
        // Tracked metric: show progress bar
        var pct = Math.min(100, Math.round((p.currentValue / p.threshold) * 100)) || 0;
        var barBg = pct >= 100 ? 'linear-gradient(90deg, #059669, #10b981)' : 'linear-gradient(90deg, #6d28d9, #8b5cf6)';
        var valColor = pct >= 100 ? '#34d399' : '#c4b5fd';
        var checkmark = pct >= 100 ? ' <i class="fa fa-check-circle" style="color:#34d399; font-size:13px; margin-left:4px;"></i>' : '';
        // Lifetime total alongside the since-promotion count, when they differ.
        var allTimeSuffix = '';
        if (resetStatsOnPromotion && typeof p.allTimeValue === 'number' && p.allTimeValue !== p.currentValue) {
          allTimeSuffix = ' <span style="color:#7c7f96; font-size:11px; font-weight:500;">· ' + p.allTimeValue + ' all-time</span>';
        }
        barsHtml += '<div style="padding:0;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">' +
            '<span style="color:#c8c6d8; font-size:14px; font-weight:500;">' + escapeHtmlRank(p.displayName || p.metricType) + checkmark + '</span>' +
            '<span style="color:' + valColor + '; font-size:14px; font-weight:700; font-variant-numeric:tabular-nums;">' + p.currentValue + ' / ' + p.threshold + allTimeSuffix + '</span>' +
          '</div>' +
          '<div style="width:100%; height:8px; background:rgba(55,65,81,0.6); border-radius:4px; overflow:hidden;">' +
            '<div style="width:' + pct + '%; height:100%; background:' + barBg + '; border-radius:4px; transition:width 0.6s cubic-bezier(0.4,0,0.2,1);"></div>' +
          '</div>' +
        '</div>';
      }
    });
    barsContainer.innerHTML = barsHtml;
    // Show fade hint if content overflows
    var fadeEl = document.getElementById('rankProgressFade');
    if (fadeEl) {
      setTimeout(function() {
        fadeEl.style.display = barsContainer.scrollHeight > barsContainer.clientHeight ? 'block' : 'none';
        barsContainer.addEventListener('scroll', function() {
          var atBottom = barsContainer.scrollTop + barsContainer.clientHeight >= barsContainer.scrollHeight - 4;
          fadeEl.style.display = atBottom ? 'none' : 'block';
        });
      }, 50);
    }
  } else {
    barsContainer.innerHTML = '';
  }

  // Rank change detection — promotion (celebrate) or demotion (notify)
  var deptId = _getRankConfig().deptId;
  if (currentRank && deptId) {
    var lsKey = 'last_seen_rank_' + deptId;
    var lsOrderKey = 'last_seen_rank_order_' + deptId;
    var lsNameKey = 'last_seen_rank_name_' + deptId;
    var lastSeenRank = localStorage.getItem(lsKey);
    var lastSeenOrder = parseInt(localStorage.getItem(lsOrderKey));
    var lastSeenRankName = localStorage.getItem(lsNameKey);
    if (lastSeenRank && lastSeenRank !== currentRank._id && !isNaN(lastSeenOrder)) {
      var prevRank = lastSeenRankName ? { name: lastSeenRankName } : null;
      if (currentRank.displayOrder < lastSeenOrder) {
        // Promoted (lower displayOrder = higher rank)
        showPromoModal(currentRank, prevRank);
      } else if (currentRank.displayOrder > lastSeenOrder) {
        // Demoted (higher displayOrder = lower rank)
        showDemoModal(currentRank, prevRank);
      }
    }
    localStorage.setItem(lsKey, currentRank._id);
    localStorage.setItem(lsOrderKey, currentRank.displayOrder);
    localStorage.setItem(lsNameKey, currentRank.name);
  }

  // Stats grid (collapsible)
  var gridContainer = document.getElementById('rankStatsGrid');
  var statsSection = document.getElementById('rankStatsSection');
  if (metrics && metrics.length > 0) {
    if (statsSection) statsSection.style.display = 'block';
    var gridHtml = '';
    metrics.forEach(function(m) {
      // Lifetime figure under the tile so "since promotion" numbers don't look
      // like lost progress.
      var allTimeLine = '';
      if (resetStatsOnPromotion && typeof m.allTimeValue === 'number' && m.allTimeValue !== m.currentValue) {
        allTimeLine = '<div style="color:#5b5e73; font-size:10px; font-weight:500; margin-top:4px; line-height:1.2;">' + m.allTimeValue + ' all-time</div>';
      }
      gridHtml += '<div style="background:rgba(30,32,40,0.7); border:1px solid rgba(53,56,90,0.5); border-radius:10px; padding:14px 12px; text-align:center;">' +
        '<div style="color:#fff; font-size:24px; font-weight:700; line-height:1.1; font-variant-numeric:tabular-nums;">' + (m.currentValue || 0) + '</div>' +
        '<div style="color:#7c7f96; font-size:11px; text-transform:uppercase; letter-spacing:0.8px; font-weight:500; margin-top:6px; line-height:1.3;">' + escapeHtmlRank(m.displayName || m.metricType) + '</div>' +
        allTimeLine +
      '</div>';
    });
    gridContainer.innerHTML = gridHtml;

    // Caption the grid so officers know which window these numbers cover.
    // Created on the fly — this script is shared by several dashboards and
    // none of them declare the element.
    var statsCaption = document.getElementById('rankStatsCaption');
    if (!statsCaption && gridContainer && gridContainer.parentNode) {
      statsCaption = document.createElement('div');
      statsCaption.id = 'rankStatsCaption';
      statsCaption.style.cssText =
        'color:#7c7f96; font-size:11px; font-weight:500; letter-spacing:0.3px; margin-bottom:8px;';
      gridContainer.parentNode.insertBefore(statsCaption, gridContainer);
    }
    if (statsCaption) {
      statsCaption.textContent = resetStatsOnPromotion
        ? 'Since your last promotion'
        : '';
      statsCaption.style.display = resetStatsOnPromotion ? 'block' : 'none';
    }
  } else {
    if (statsSection) statsSection.style.display = 'none';
    gridContainer.innerHTML = '';
  }

  // Rank Ladder
  var ladderSection = document.getElementById('rankLadderSection');
  var ladderContainer = document.getElementById('rankLadderContainer');
  if (ladderSection && ladderContainer && allRanks.length > 0) {
    ladderSection.style.display = 'block';
    var sorted = allRanks.slice().sort(function(a, b) { return a.displayOrder - b.displayOrder; });
    var currentId = currentRank ? currentRank._id : null;
    var currentOrder = currentRank ? currentRank.displayOrder : -1;
    var nextId = nextRank ? nextRank._id : null;
    var ladderHtml = '<div style="display:flex; justify-content:space-between; margin-bottom:10px; padding:0 4px;"><span style="color:#6b7280; font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.8px;">Highest Rank</span></div>';

    sorted.forEach(function(rank, index) {
      var isCurrent = rank._id === currentId;
      var isPassed = currentId && rank.displayOrder > currentOrder;
      var isNext = rank._id === nextId;
      var isFirst = index === 0;
      var isLast = index === sorted.length - 1;
      var reqCount = rank.requirements ? rank.requirements.length : 0;
      var rankElId = 'rankLadderRow_' + (rank._id || index);

      // Node styling
      var nodeSize = isCurrent ? 28 : 22;
      var nodeBg, nodeBorder, iconHtml, textColor, fontWeight;

      if (isCurrent) {
        nodeBg = 'rgba(124,58,237,0.25)';
        nodeBorder = '#8b5cf6';
        iconHtml = '<i class="fa fa-shield" style="font-size:11px; color:#a78bfa;"></i>';
        textColor = '#fff';
        fontWeight = '700';
      } else if (isPassed) {
        nodeBg = 'rgba(52,211,153,0.15)';
        nodeBorder = 'rgba(52,211,153,0.3)';
        iconHtml = '<i class="fa fa-check-circle" style="font-size:10px; color:#34d399;"></i>';
        textColor = '#9ca3af';
        fontWeight = '500';
      } else if (isNext) {
        nodeBg = 'rgba(56,189,248,0.12)';
        nodeBorder = 'rgba(56,189,248,0.3)';
        iconHtml = '<i class="fa fa-arrow-up" style="font-size:9px; color:#38bdf8;"></i>';
        textColor = '#38bdf8';
        fontWeight = '600';
      } else if (isFirst) {
        nodeBg = 'rgba(251,191,36,0.12)';
        nodeBorder = 'rgba(251,191,36,0.2)';
        iconHtml = '<i class="fa fa-trophy" style="font-size:9px; color:#fbbf24;"></i>';
        textColor = '#6b7280';
        fontWeight = '500';
      } else {
        nodeBg = 'rgba(255,255,255,0.06)';
        nodeBorder = 'rgba(255,255,255,0.08)';
        iconHtml = '<i class="fa fa-lock" style="font-size:8px; color:rgba(255,255,255,0.2);"></i>';
        textColor = '#6b7280';
        fontWeight = '500';
      }

      var lineAboveColor = (isPassed || isCurrent) ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.06)';
      var lineBelowColor = (isPassed && !isCurrent) ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.06)';

      // Badge
      var badgeHtml = '';
      if (isCurrent) {
        badgeHtml = '<span style="background:rgba(124,58,237,0.15); border:1px solid rgba(124,58,237,0.3); color:#a78bfa; font-size:9px; font-weight:800; letter-spacing:0.8px; padding:1px 6px; border-radius:4px; margin-left:8px;">YOU</span>';
      } else if (isNext) {
        badgeHtml = '<span style="background:rgba(56,189,248,0.1); border:1px solid rgba(56,189,248,0.2); color:#38bdf8; font-size:9px; font-weight:700; letter-spacing:0.5px; padding:1px 6px; border-radius:4px; margin-left:8px;">NEXT</span>';
      }

      // Chevron for expandable rows
      var chevronHtml = reqCount > 0
        ? '<i class="fa fa-chevron-down" id="' + rankElId + '_chevron" style="font-size:9px; color:#6b7280; margin-left:auto; padding-left:8px; transition:transform 0.2s;"></i>'
        : '';

      // Meta
      var metaParts = [];
      if (rank.isDefault) metaParts.push('<span style="color:#6b7280; font-size:11px; font-weight:600;">Default</span>');
      if (reqCount > 0) metaParts.push('<span style="color:#6b7280; font-size:11px;">' + reqCount + ' req' + (reqCount !== 1 ? 's' : '') + '</span>');
      if (rank.autoPromote) metaParts.push('<span style="color:rgba(52,211,153,0.6); font-size:11px;">Auto</span>');
      var metaHtml = metaParts.length > 0 ? '<div style="display:flex; gap:8px; margin-top:2px;">' + metaParts.join('') + '</div>' : '';

      var glowStyle = isCurrent ? 'box-shadow:0 0 12px rgba(124,58,237,0.35);' : '';
      var cursorStyle = reqCount > 0 ? 'cursor:pointer;' : '';

      // Requirements list (hidden by default)
      var reqsHtml = '';
      if (reqCount > 0) {
        reqsHtml = '<div id="' + rankElId + '_reqs" style="display:none; margin-left:46px; padding-left:10px; border-left:1px solid rgba(255,255,255,0.06); margin-bottom:6px;">';
        rank.requirements.forEach(function(req) {
          var label = req.metricType === 'custom'
            ? escapeHtmlRank(req.customLabel || 'Custom Requirement')
            : escapeHtmlRank(_formatMetricType(req.metricType));
          var threshHtml = (req.metricType !== 'custom' && req.threshold > 0)
            ? '<span style="color:#6b7280; font-size:11px; font-weight:600; font-variant-numeric:tabular-nums; margin-left:auto; padding-left:8px;">' + req.threshold + '</span>'
            : '';
          reqsHtml += '<div style="display:flex; align-items:center; gap:8px; padding:4px 0;">' +
            '<div style="width:4px; height:4px; border-radius:2px; background:#6b7280; flex-shrink:0;"></div>' +
            '<span style="color:#6b7280; font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + label + '</span>' +
            threshHtml +
          '</div>';
        });
        reqsHtml += '</div>';
      }

      ladderHtml += '<div>' +
        '<div style="display:flex; align-items:stretch; ' + cursorStyle + '" ' +
          (reqCount > 0 ? 'onclick="toggleLadderReqs(\'' + rankElId + '\')"' : '') + '>' +
          '<div style="width:36px; display:flex; flex-direction:column; align-items:center;">' +
            (isFirst
              ? '<div style="height:4px;"></div>'
              : '<div style="width:2px; height:12px; background:' + lineAboveColor + ';"></div>') +
            '<div style="width:' + nodeSize + 'px; height:' + nodeSize + 'px; border-radius:50%; background:' + nodeBg + '; border:' + (isCurrent ? '2' : '1.5') + 'px solid ' + nodeBorder + '; display:flex; align-items:center; justify-content:center; flex-shrink:0; ' + glowStyle + '">' +
              iconHtml +
            '</div>' +
            (isLast
              ? '<div style="height:4px;"></div>'
              : '<div style="width:2px; flex:1; min-height:12px; background:' + lineBelowColor + ';"></div>') +
          '</div>' +
          '<div style="flex:1; padding:6px 0 6px 10px; display:flex; flex-direction:column; justify-content:center; min-height:44px;">' +
            '<div style="display:flex; align-items:center;">' +
              '<span style="color:' + textColor + '; font-size:' + (isCurrent ? '15' : '14') + 'px; font-weight:' + fontWeight + '; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' +
                (rank.prefix ? escapeHtmlRank(rank.prefix) + ' &mdash; ' : '') + escapeHtmlRank(rank.name) +
              '</span>' +
              badgeHtml +
              chevronHtml +
            '</div>' +
            metaHtml +
          '</div>' +
        '</div>' +
        reqsHtml +
      '</div>';
    });

    ladderHtml += '<div style="display:flex; justify-content:space-between; margin-top:10px; padding:0 4px;"><span style="color:#6b7280; font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.8px;">Lowest Rank</span></div>';
    ladderContainer.innerHTML = ladderHtml;
  }
}

window.toggleRankStats = function() {
  var collapsible = document.getElementById('rankStatsCollapsible');
  var icon = document.getElementById('rankStatsToggleIcon');
  var text = document.getElementById('rankStatsToggleText');
  if (!collapsible) return;
  var isOpen = collapsible.style.maxHeight && collapsible.style.maxHeight !== '0px';
  if (isOpen) {
    collapsible.style.maxHeight = '0px';
    icon.style.transform = 'rotate(0deg)';
    text.textContent = 'Show My Activity';
  } else {
    collapsible.style.maxHeight = collapsible.scrollHeight + 'px';
    icon.style.transform = 'rotate(180deg)';
    text.textContent = 'Hide My Activity';
  }
};

function _formatMetricType(type) {
  if (!type) return '';
  return type.replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
}

window.toggleLadderReqs = function(rankElId) {
  var reqs = document.getElementById(rankElId + '_reqs');
  var chevron = document.getElementById(rankElId + '_chevron');
  if (!reqs) return;
  var isOpen = reqs.style.display !== 'none';
  reqs.style.display = isOpen ? 'none' : 'block';
  if (chevron) chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
};

window.toggleRankLadder = function() {
  var collapsible = document.getElementById('rankLadderCollapsible');
  var icon = document.getElementById('rankLadderToggleIcon');
  var text = document.getElementById('rankLadderToggleText');
  if (!collapsible) return;
  var isOpen = collapsible.style.maxHeight && collapsible.style.maxHeight !== '0px';
  if (isOpen) {
    collapsible.style.maxHeight = '0px';
    icon.style.transform = 'rotate(0deg)';
    text.textContent = 'View Rank Ladder';
  } else {
    collapsible.style.maxHeight = collapsible.scrollHeight + 'px';
    icon.style.transform = 'rotate(180deg)';
    text.textContent = 'Hide Rank Ladder';
  }
};

function showPromoModal(newRank, previousRank) {
  var overlay = document.getElementById('promoModalOverlay');
  document.getElementById('promoModalRankName').textContent = newRank.name;
  if (newRank.prefix) {
    document.getElementById('promoModalPrefix').textContent = newRank.prefix;
    document.getElementById('promoModalPrefixWrap').style.display = 'inline-block';
  } else {
    document.getElementById('promoModalPrefixWrap').style.display = 'none';
  }
  var fromName = previousRank ? previousRank.name : 'Unranked';
  document.getElementById('promoModalFrom').textContent = fromName;
  document.getElementById('promoModalTo').textContent = newRank.name;
  overlay.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  setTimeout(function() { launchPromoConfetti(); }, 600);
}

window.dismissPromoModal = function() {
  document.getElementById('promoModalOverlay').classList.remove('is-open');
  document.body.style.overflow = '';
};

function showDemoModal(newRank, previousRank) {
  document.getElementById('demoModalRankName').textContent = newRank.name;
  var fromName = previousRank ? previousRank.name : 'Unknown';
  document.getElementById('demoModalFrom').textContent = fromName;
  document.getElementById('demoModalTo').textContent = newRank.name;
  document.getElementById('demoModalOverlay').classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

window.dismissDemoModal = function() {
  document.getElementById('demoModalOverlay').classList.remove('is-open');
  document.body.style.overflow = '';
};

function launchPromoConfetti() {
  var canvas = document.getElementById('promoModalConfetti');
  var modal = document.getElementById('promoModal');
  if (!canvas || !modal) return;
  canvas.width = modal.offsetWidth;
  canvas.height = modal.offsetHeight;
  var ctx = canvas.getContext('2d');
  var particles = [];
  var colors = ['#fbbf24', '#f59e0b', '#34d399', '#a78bfa', '#f87171', '#60a5fa', '#fb923c', '#e879f9', '#fff'];
  var cw = canvas.width, ch = canvas.height;

  for (var i = 0; i < 90; i++) {
    particles.push({
      x: cw * 0.5 + (Math.random() - 0.5) * 60,
      y: ch * 0.35,
      vx: (Math.random() - 0.5) * 16,
      vy: Math.random() * -14 - 2,
      w: Math.random() * 8 + 3,
      h: Math.random() * 5 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 20,
      gravity: 0.32 + Math.random() * 0.12,
      opacity: 1,
      decay: 0.005 + Math.random() * 0.005
    });
  }

  var frame;
  function animate() {
    ctx.clearRect(0, 0, cw, ch);
    var alive = false;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      if (p.opacity <= 0) continue;
      alive = true;
      p.x += p.vx; p.vy += p.gravity; p.y += p.vy;
      p.vx *= 0.98; p.rotation += p.rotSpeed; p.opacity -= p.decay;
      if (p.opacity <= 0) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation * Math.PI / 180);
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (alive) { frame = requestAnimationFrame(animate); }
    else { ctx.clearRect(0, 0, cw, ch); }
  }
  animate();
  setTimeout(function() {
    cancelAnimationFrame(frame);
    ctx.clearRect(0, 0, cw, ch);
  }, 5000);
}

function escapeHtmlRank(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Auto-refresh rank progress when user returns to the page
(function() {
  var _rankRefreshCooldown = 0;
  function refreshRank() {
    if (typeof loadMyRankProgress !== 'function') return;
    var now = Date.now();
    if (now - _rankRefreshCooldown > 30000) {
      _rankRefreshCooldown = now;
      loadMyRankProgress();
    }
  }
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') refreshRank();
  });
  window.addEventListener('focus', refreshRank);
})();