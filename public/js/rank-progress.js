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

  fetch(cfg.apiUrl + '/api/v1/community/' + communityId + '/departments/' + cfg.deptId + '/members/' + cfg.user._id + '/rank-progress')
    .then(function(r) {
      if (!r.ok) throw new Error('Rank progress not available');
      return r.json();
    })
    .then(function(data) {
      renderRankProgress(data);
    })
    .catch(function(err) {
      // Silently ignore - ranks may not be configured for this department
      console.debug('Rank progress not available:', err.message);
    });
}

function renderRankProgress(data) {
  var currentRank = data.currentRank;
  var nextRank = data.nextRank;
  var metrics = data.metrics || [];
  var progress = data.progress || [];

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
      var pct = Math.min(100, Math.round((p.currentValue / p.threshold) * 100)) || 0;
      var barBg = pct >= 100 ? 'linear-gradient(90deg, #059669, #10b981)' : 'linear-gradient(90deg, #6d28d9, #8b5cf6)';
      var valColor = pct >= 100 ? '#34d399' : '#c4b5fd';
      var checkmark = pct >= 100 ? ' <i class="fa fa-check-circle" style="color:#34d399; font-size:13px; margin-left:4px;"></i>' : '';
      barsHtml += '<div style="padding:0;">' +
        '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">' +
          '<span style="color:#c8c6d8; font-size:14px; font-weight:500;">' + escapeHtmlRank(p.displayName || p.metricType) + checkmark + '</span>' +
          '<span style="color:' + valColor + '; font-size:14px; font-weight:700; font-variant-numeric:tabular-nums;">' + p.currentValue + ' / ' + p.threshold + '</span>' +
        '</div>' +
        '<div style="width:100%; height:8px; background:rgba(55,65,81,0.6); border-radius:4px; overflow:hidden;">' +
          '<div style="width:' + pct + '%; height:100%; background:' + barBg + '; border-radius:4px; transition:width 0.6s cubic-bezier(0.4,0,0.2,1);"></div>' +
        '</div>' +
      '</div>';
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
      gridHtml += '<div style="background:rgba(30,32,40,0.7); border:1px solid rgba(53,56,90,0.5); border-radius:10px; padding:14px 12px; text-align:center;">' +
        '<div style="color:#fff; font-size:24px; font-weight:700; line-height:1.1; font-variant-numeric:tabular-nums;">' + (m.currentValue || 0) + '</div>' +
        '<div style="color:#7c7f96; font-size:11px; text-transform:uppercase; letter-spacing:0.8px; font-weight:500; margin-top:6px; line-height:1.3;">' + escapeHtmlRank(m.displayName || m.metricType) + '</div>' +
      '</div>';
    });
    gridContainer.innerHTML = gridHtml;
  } else {
    if (statsSection) statsSection.style.display = 'none';
    gridContainer.innerHTML = '';
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