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
  // Note this does NOT return early. This file is pulled in by footer.ejs and
  // last-dashboard-tracker.ejs on nearly every page, so a browser almost always
  // holds a cached copy. If an older copy runs first it sets this flag and
  // returns before exporting anything; a newer copy loaded afterwards would then
  // no-op and leave window.whatsNewPreview undefined forever. The flag now
  // guards only the one thing that must not happen twice: the auto-load.
  var alreadyInitialized = window.__whatsNewInit;
  window.__whatsNewInit = true;

  var dbUser = window.dbUser;
  // dbUser may be either the flat user doc ({_id, ...}) or a wrapper
  // ({user: {_id, ...}}) depending on the host page — accept both.
  var userId = dbUser && (dbUser._id || (dbUser.user && dbUser.user._id));
  // No early return on a missing userId: only the auto-load below needs a
  // session. The preview export must still exist so the admin console can call
  // it, and bailing here would leave window.whatsNewPreview undefined.

  function apiBase() {
    return (window.ddConfig && window.ddConfig.API_URL) ||
      window.POLICE_CAD_API_URL ||
      window.API_URL ||
      'https://police-cad-app-api-bc6d659b60b3.herokuapp.com';
  }

  function injectStyles() {
    if (document.getElementById('whats-new-styles')) return;
    var css = [
      /* ── overlay: dim + cyan-tinted vignette, blurred backdrop ── */
      ".wn-overlay{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:24px;",
      "background:radial-gradient(130% 120% at 50% -10%,rgba(56,189,248,.12),rgba(3,7,15,.68) 58%);",
      "backdrop-filter:blur(7px) saturate(120%);-webkit-backdrop-filter:blur(7px) saturate(120%);",
      "opacity:0;animation:wn-fade .28s ease forwards;",
      "font-family:'Outfit','Segoe UI',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}",
      "@keyframes wn-fade{to{opacity:1}}",

      /* ── card: layered dark glass, cyan edge, ambient glow ── */
      ".wn-card{position:relative;width:100%;max-width:456px;max-height:min(86vh,660px);display:flex;flex-direction:column;",
      "background:linear-gradient(180deg,#101c31 0%,#0a1120 62%,#080e1a 100%);",
      "border:1px solid rgba(56,189,248,.22);border-radius:24px;overflow:hidden;",
      "box-shadow:0 34px 90px -24px rgba(0,0,0,.75),0 1px 0 rgba(255,255,255,.04) inset,0 0 70px -26px rgba(56,189,248,.4);",
      "transform:translateY(16px) scale(.98);opacity:0;animation:wn-rise .44s cubic-bezier(.2,.85,.25,1) .05s forwards;}",
      "@keyframes wn-rise{to{transform:none;opacity:1}}",
      /* animated top accent line */
      ".wn-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;z-index:2;",
      "background:linear-gradient(90deg,transparent,#38bdf8 28%,#a5e8ff 50%,#38bdf8 72%,transparent);",
      "background-size:200% 100%;animation:wn-shimmer 4.5s linear infinite;}",
      "@keyframes wn-shimmer{to{background-position:200% 0}}",
      /* ambient corner glow */
      ".wn-card::after{content:'';position:absolute;top:-45%;right:-35%;width:80%;height:80%;pointer-events:none;z-index:0;",
      "background:radial-gradient(circle,rgba(56,189,248,.16),transparent 68%);}",
      ".wn-card>*{position:relative;z-index:1;}",

      /* mobile grab handle (hidden on desktop) */
      ".wn-grab{display:none;flex:0 0 auto;width:38px;height:4px;border-radius:99px;background:rgba(255,255,255,.2);margin:10px auto 0;}",

      /* ── header ── */
      ".wn-head{flex:0 0 auto;padding:22px 24px 2px;}",
      ".wn-eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#7dd3fc;}",
      ".wn-eyebrow i{width:6px;height:6px;border-radius:50%;background:#38bdf8;animation:wn-pulse 2s infinite;}",
      "@keyframes wn-pulse{0%{box-shadow:0 0 0 0 rgba(56,189,248,.55)}70%{box-shadow:0 0 0 7px rgba(56,189,248,0)}100%{box-shadow:0 0 0 0 rgba(56,189,248,0)}}",
      ".wn-close{position:absolute;top:16px;right:16px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;",
      "border:none;border-radius:9px;background:rgba(255,255,255,.05);color:#8296b0;cursor:pointer;font-size:16px;line-height:1;transition:.15s;}",
      ".wn-close:hover{background:rgba(255,255,255,.11);color:#eaf2fb;}",
      ".wn-title{margin:12px 24px 0;color:#f2f7fd;font-size:22px;font-weight:700;line-height:1.22;letter-spacing:-.01em;}",

      /* ── scrollable body + bottom fade affordance ── */
      ".wn-bodywrap{position:relative;flex:1 1 auto;min-height:0;margin-top:12px;}",
      ".wn-body{height:100%;overflow-y:auto;padding:0 24px 22px;color:#b4c2d6;font-size:14.5px;line-height:1.62;",
      "scrollbar-width:thin;scrollbar-color:rgba(56,189,248,.32) transparent;}",
      ".wn-body::-webkit-scrollbar{width:9px}",
      ".wn-body::-webkit-scrollbar-thumb{background:rgba(56,189,248,.28);border-radius:99px;border:3px solid transparent;background-clip:content-box}",
      ".wn-body::-webkit-scrollbar-thumb:hover{background:rgba(56,189,248,.5);background-clip:content-box}",
      ".wn-body>*:first-child{margin-top:0}",
      ".wn-body p{margin:0 0 11px}",
      ".wn-body b,.wn-body strong{color:#eaf2fb;font-weight:600}",
      ".wn-body a{color:#5cc6fa;text-decoration:none;border-bottom:1px solid rgba(92,198,250,.35);transition:.15s}",
      ".wn-body a:hover{border-bottom-color:#5cc6fa}",
      ".wn-body img{max-width:100%;border-radius:12px;margin:12px 0;border:1px solid rgba(255,255,255,.07);display:block}",
      ".wn-body ul,.wn-body ol{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:12px}",
      ".wn-body li{position:relative;padding-left:22px}",
      ".wn-body li::before{content:'';position:absolute;left:2px;top:.6em;width:7px;height:7px;border-radius:50%;",
      "background:#38bdf8;box-shadow:0 0 9px rgba(56,189,248,.75)}",
      /* icon-led bullets: a leading FontAwesome icon becomes a cyan chip marker */
      ".wn-body li:has(> i[class*='fa']){display:flex;gap:13px;align-items:flex-start;padding-left:0}",
      ".wn-body li:has(> i[class*='fa'])::before{display:none}",
      ".wn-body li>i[class*='fa']{flex:0 0 auto;width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;",
      "font-size:13px;color:#7dd3fc;background:rgba(56,189,248,.10);border:1px solid rgba(56,189,248,.24);border-radius:8px;margin-top:1px}",
      ".wn-body li>i[class*='fa']+span{flex:1 1 auto;min-width:0}",
      /* ── admin preview bar (preview mode only) ──
         Sits below the card as a sibling, never inside it, so the previewed
         card is byte-for-byte what ships. */
      ".wn-adminbar{position:absolute;left:50%;transform:translateX(-50%);bottom:22px;z-index:3;",
      "display:flex;align-items:center;gap:14px;flex-wrap:wrap;justify-content:center;",
      "padding:11px 16px;border-radius:14px;background:rgba(8,14,26,.92);",
      "border:1px solid rgba(255,255,255,.10);box-shadow:0 12px 34px -10px rgba(0,0,0,.7);",
      "font-family:'Outfit','Segoe UI',system-ui,sans-serif;}",
      ".wn-adminbar-note{color:#8296b0;font-size:12.5px;}",
      ".wn-adminbar-btns{display:flex;gap:8px;}",
      ".wn-adminbar-btn{appearance:none;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;",
      "padding:8px 14px;border-radius:9px;transition:.15s;}",
      ".wn-adminbar-ghost{background:transparent;border:1px solid rgba(255,255,255,.14);color:#c7ccdd;}",
      ".wn-adminbar-ghost:hover{background:rgba(255,255,255,.07);color:#eaf2fb;}",
      ".wn-adminbar-go{border:none;background:linear-gradient(135deg,#38bdf8,#0ea5e9);color:#04121f;}",
      ".wn-adminbar-go:hover{filter:brightness(1.08);}",
      "@media (max-width:560px){.wn-adminbar{left:16px;right:16px;transform:none;bottom:14px;}}",

      ".wn-fade{position:absolute;left:0;right:0;bottom:0;height:46px;pointer-events:none;opacity:0;transition:opacity .2s;",
      "background:linear-gradient(to top,#080e1a,rgba(8,14,26,0))}",
      ".wn-bodywrap.scrollable .wn-fade{opacity:1}",

      /* ── footer: progress dots + button ── */
      ".wn-foot{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:14px;",
      "padding:14px 24px 20px;border-top:1px solid rgba(255,255,255,.05)}",
      ".wn-dots{display:flex;gap:6px}",
      ".wn-dots span{width:6px;height:6px;border-radius:99px;background:rgba(255,255,255,.18);transition:width .28s,background .28s}",
      ".wn-dots span.on{width:20px;background:linear-gradient(90deg,#38bdf8,#a5e8ff)}",
      ".wn-btn{appearance:none;border:none;cursor:pointer;font-family:inherit;font-size:14px;font-weight:600;color:#04121f;",
      "padding:10px 22px;border-radius:12px;background:linear-gradient(180deg,#8ad9ff,#38bdf8);",
      "box-shadow:0 10px 22px -10px rgba(56,189,248,.85);transition:filter .16s,transform .16s;white-space:nowrap}",
      ".wn-btn:hover{filter:brightness(1.07);transform:translateY(-1px)}",
      ".wn-btn:active{transform:translateY(0)}",

      /* ── mobile: dock as a bottom sheet ── */
      "@media (max-width:520px){",
      ".wn-overlay{align-items:flex-end;padding:0}",
      /* opacity:1 is REQUIRED: the base card is opacity:0 + wn-rise; the sheet */
      /* animation below only moves transform, so without this the card stays */
      /* invisible on mobile (backdrop shows, card doesn't). */
      ".wn-card{max-width:none;width:100%;max-height:90vh;border-radius:24px 24px 0 0;border-bottom:none;opacity:1;",
      "transform:translateY(100%);animation:wn-sheet .42s cubic-bezier(.2,.85,.25,1) forwards}",
      ".wn-grab{display:block}",
      ".wn-title{font-size:20px}",
      ".wn-foot{padding-bottom:calc(20px + env(safe-area-inset-bottom))}",
      "}",
      "@keyframes wn-sheet{from{transform:translateY(100%)}to{transform:none}}",
      "@media (prefers-reduced-motion:reduce){.wn-overlay,.wn-card{animation-duration:.01ms}.wn-card::before{animation:none}}"
    ].join('');
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

  /**
   * @param posts   the changelog posts to page through
   * @param opts    {preview:boolean, actions:{confirmLabel, onConfirm, onCancel}}
   *
   * Preview mode reuses this function rather than rendering a lookalike, so what
   * an admin approves is the same DOM and the same stylesheet users get. The
   * only differences are that nothing is marked seen (a draft has no id yet) and
   * an action bar is appended to the overlay OUTSIDE the card, so the card stays
   * pixel-accurate.
   */
  function show(posts, opts) {
    if (!posts || !posts.length) return;
    opts = opts || {};
    injectStyles();

    var idx = 0;
    var prevBodyOverflow = '';

    var overlay = document.createElement('div');
    overlay.className = 'wn-overlay';
    overlay.innerHTML =
      '<div class="wn-card" role="dialog" aria-modal="true" aria-labelledby="wn-title">' +
        '<div class="wn-grab"></div>' +
        '<div class="wn-head">' +
          '<span class="wn-eyebrow"><i></i>What’s New</span>' +
          '<button type="button" class="wn-close" aria-label="Close">×</button>' +
        '</div>' +
        '<h3 class="wn-title" id="wn-title"></h3>' +
        '<div class="wn-bodywrap"><div class="wn-body"></div><div class="wn-fade"></div></div>' +
        '<div class="wn-foot"><div class="wn-dots"></div>' +
          '<button type="button" class="wn-btn"></button></div>' +
      '</div>';

    var card = overlay.querySelector('.wn-card');
    var titleEl = overlay.querySelector('.wn-title');
    var bodyWrap = overlay.querySelector('.wn-bodywrap');
    var bodyEl = overlay.querySelector('.wn-body');
    var dotsEl = overlay.querySelector('.wn-dots');
    var btn = overlay.querySelector('.wn-btn');
    var closeBtn = overlay.querySelector('.wn-close');

    function updateFade() {
      // Show the bottom fade only while there's more to scroll to.
      var more = bodyEl.scrollHeight - bodyEl.clientHeight - bodyEl.scrollTop > 4;
      bodyWrap.classList.toggle('scrollable', more);
    }

    function render() {
      var post = posts[idx];
      titleEl.textContent = post.title || '';
      // Body is staff-authored trusted HTML.
      bodyEl.innerHTML = post.body || '';
      bodyEl.scrollTop = 0;

      // Progress dots — only meaningful with multiple posts.
      if (posts.length > 1) {
        var dots = '';
        for (var i = 0; i < posts.length; i++) {
          dots += '<span class="' + (i === idx ? 'on' : '') + '"></span>';
        }
        dotsEl.innerHTML = dots;
      } else {
        dotsEl.innerHTML = '';
      }

      btn.textContent = (idx < posts.length - 1) ? 'Next' : 'Got it';
      updateFade();
      btn.focus();
    }

    function close() {
      document.removeEventListener('keydown', onKey);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      document.body.style.overflow = prevBodyOverflow; // restore background scroll
    }

    // Advance to the next post; mark the current one seen so it won't return.
    function next() {
      if (!opts.preview) markSeen(posts[idx]._id);
      idx++;
      if (idx >= posts.length) { close(); return; }
      render();
    }

    // Dismiss (X / Esc / backdrop): mark the current post seen and close;
    // any remaining posts surface on the next visit.
    function dismiss() {
      if (!opts.preview) markSeen(posts[idx]._id);
      close();
      if (opts.actions && opts.actions.onCancel) opts.actions.onCancel();
    }

    function onKey(e) {
      if (e.key === 'Escape') dismiss();
    }

    btn.addEventListener('click', next);
    closeBtn.addEventListener('click', dismiss);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) dismiss(); });
    bodyEl.addEventListener('scroll', updateFade);
    window.addEventListener('resize', updateFade);
    document.addEventListener('keydown', onKey);

    // Admin action bar. Deliberately a sibling of the card, not inside it, so
    // the previewed card is exactly what ships.
    if (opts.actions && opts.actions.onConfirm) {
      var bar = document.createElement('div');
      bar.className = 'wn-adminbar';
      bar.innerHTML =
        '<span class="wn-adminbar-note">Preview — this is exactly what users will see.</span>' +
        '<div class="wn-adminbar-btns">' +
          '<button type="button" class="wn-adminbar-btn wn-adminbar-ghost">Keep editing</button>' +
          '<button type="button" class="wn-adminbar-btn wn-adminbar-go">' +
            (opts.actions.confirmLabel || 'Publish') +
          '</button>' +
        '</div>';
      bar.addEventListener('click', function (e) { e.stopPropagation(); });
      bar.querySelector('.wn-adminbar-ghost').addEventListener('click', dismiss);
      bar.querySelector('.wn-adminbar-go').addEventListener('click', function () {
        close();
        opts.actions.onConfirm();
      });
      overlay.appendChild(bar);
    }

    render();
    prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // lock background scroll while open
    document.body.appendChild(overlay);
    // Recompute the fade once layout has settled (fonts/images can change height).
    setTimeout(updateFade, 60);
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

  /**
   * Render a draft post exactly as users will see it, with an approve/cancel bar.
   * Used by the admin console so a post can be checked before it goes out to
   * everyone — a changelog post cannot be un-shown once someone has seen it.
   */
  window.whatsNewPreview = function (post, actions) {
    show([post], { preview: true, actions: actions || {} });
  };

  if (alreadyInitialized) return; // another copy already armed the auto-load
  if (!userId) return; // unauthenticated — nothing to auto-show

  // Small delay so dbUser and the page have settled before we overlay anything.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(load, 600); });
  } else {
    setTimeout(load, 600);
  }
})();
