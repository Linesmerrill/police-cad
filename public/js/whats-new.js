/**
 * whats-new.js — platform "What's New" launch modal.
 *
 * Loaded as a static script (NOT an EJS include) so it works no matter how the
 * host page pulls in the footer/tracker — old-style `<% include %>` inlines a
 * partial into the parent's directory, which breaks relative EJS include paths.
 * A plain <script src> sidesteps all of that.
 *
 * Self-contained and idempotent: builds its own DOM + styles the first time it
 * runs and no-ops on any subsequent load (safe if both footer and tracker pull
 * it in on the same page).
 *
 * On an authenticated page it asks the API for the changelog posts this user
 * hasn't seen (GET /user/{id}/announcements?surface=web), shows them one at a
 * time, and marks each seen (PUT /user/{id}/mark-announcement-seen). Seen-state
 * lives on the user document, so a post shows at most once per person even
 * across devices/reinstalls.
 */
(function () {
  if (window.__whatsNewInit) return;
  window.__whatsNewInit = true;

  var dbUser = window.dbUser;
  var userId = dbUser && dbUser._id;
  if (!userId) return; // unauthenticated / no session — nothing to show

  function apiBase() {
    return (window.ddConfig && window.ddConfig.API_URL) ||
      window.POLICE_CAD_API_URL ||
      window.API_URL ||
      'https://police-cad-app-api-bc6d659b60b3.herokuapp.com';
  }

  function injectStyles() {
    if (document.getElementById('whats-new-styles')) return;
    var css = '' +
      '.wn-overlay{position:fixed;inset:0;background:rgba(3,6,14,.72);backdrop-filter:blur(4px);' +
      'display:flex;align-items:center;justify-content:center;z-index:100000;padding:20px;}' +
      '.wn-card{background:#0b1220;border:1px solid rgba(56,189,248,.25);border-radius:16px;' +
      'max-width:440px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.5);overflow:hidden;' +
      'font-family:inherit;animation:wn-pop .18s ease-out;}' +
      '@keyframes wn-pop{from{transform:translateY(8px) scale(.98);opacity:0}to{transform:none;opacity:1}}' +
      '.wn-head{padding:18px 20px 0;display:flex;align-items:center;gap:10px;}' +
      '.wn-badge{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;' +
      'color:#38bdf8;background:rgba(56,189,248,.12);border:1px solid rgba(56,189,248,.3);' +
      'padding:3px 8px;border-radius:999px;}' +
      '.wn-title{color:#f1f5f9;font-size:19px;font-weight:700;padding:10px 20px 0;margin:0;}' +
      '.wn-body{color:#cbd5e1;font-size:14px;line-height:1.55;padding:10px 20px 18px;max-height:52vh;overflow:auto;}' +
      '.wn-body a{color:#38bdf8;}' +
      '.wn-body img{max-width:100%;border-radius:10px;margin:8px 0;}' +
      '.wn-foot{padding:0 20px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px;}' +
      '.wn-count{color:#64748b;font-size:12px;}' +
      '.wn-btn{background:#38bdf8;color:#04121f;border:none;border-radius:10px;padding:9px 18px;' +
      'font-size:14px;font-weight:600;cursor:pointer;}' +
      '.wn-btn:hover{background:#5cc6fa;}';
    var style = document.createElement('style');
    style.id = 'whats-new-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function markSeen(id) {
    try {
      fetch(apiBase() + '/api/v1/user/' + encodeURIComponent(userId) + '/mark-announcement-seen', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcementId: id })
      }).catch(function () {});
    } catch (e) {}
  }

  function show(posts) {
    if (!posts || !posts.length) return;
    injectStyles();

    var idx = 0;
    var overlay = document.createElement('div');
    overlay.className = 'wn-overlay';
    var card = document.createElement('div');
    card.className = 'wn-card';
    overlay.appendChild(card);

    function render() {
      var post = posts[idx];
      var more = posts.length - idx - 1;
      card.innerHTML = '' +
        '<div class="wn-head"><span class="wn-badge">What’s New</span></div>' +
        '<h3 class="wn-title"></h3>' +
        '<div class="wn-body"></div>' +
        '<div class="wn-foot"><span class="wn-count"></span>' +
        '<button type="button" class="wn-btn"></button></div>';
      card.querySelector('.wn-title').textContent = post.title || '';
      // Body is staff-authored trusted HTML.
      card.querySelector('.wn-body').innerHTML = post.body || '';
      card.querySelector('.wn-count').textContent = more > 0 ? ('1 of ' + (posts.length - idx) + ' updates') : '';
      var btn = card.querySelector('.wn-btn');
      btn.textContent = more > 0 ? 'Next' : 'Got it';
      btn.addEventListener('click', next);
    }

    function next() {
      markSeen(posts[idx]._id);
      idx++;
      if (idx >= posts.length) {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        return;
      }
      render();
    }

    render();
    document.body.appendChild(overlay);
  }

  function load() {
    try {
      var url = apiBase() + '/api/v1/user/' + encodeURIComponent(userId) + '/announcements?surface=web';
      fetch(url, { headers: { 'Accept': 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (json) {
          if (json && json.data && json.data.length) show(json.data);
        })
        .catch(function () {});
    } catch (e) {}
  }

  // Small delay so dbUser and the page have settled before we overlay anything.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(load, 600); });
  } else {
    setTimeout(load, 600);
  }
})();
