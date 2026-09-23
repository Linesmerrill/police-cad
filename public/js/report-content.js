/* Report any piece of content, from wherever it is shown.
 *
 * One dialog, built once and reused, so every surface that shows what someone
 * wrote offers the same flow: where did this happen, what is wrong with it,
 * which parts, and a description.
 *
 * Nothing about the content is sent from here. The server reads the content
 * itself and copies what it says, so a reporter cannot invent what someone
 * wrote and an edit cannot erase it.
 *
 * From any page:
 *   reportContent({ kind: 'announcement_comment', id: commentId,
 *                   parentId: announcementId, communityId: communityId,
 *                   what: 'this comment' })
 */
(function () {
  if (window.reportContent) return; // the footer loads this on every page

  var REASONS = [{"title": "Hate","subtext": "Slurs, Racist or sexist stereotypes, Dehumanization, Incitement of fear or discrimination, Hateful references, Hateful symbols & logos"},{"title": "Abuse & Harassment","subtext": "Insults, Unwanted Sexual Content & Graphic Objectification, Unwanted NSFW & Graphic Content, Violent Event Denial, Targeted Harassment and Inciting Harassment"},{"title": "Violent Speech","subtext": "Violent Threats, Wish of Harm, Glorification of Violence, Incitement of Violence, Coded Incitement of Violence"},{"title": "Child Safety","subtext": "Child sexual exploitation, grooming, physical child abuse, underage user"},{"title": "Privacy","subtext": "Sharing private information, threatening to share/expose private information, sharing non-consensual intimate images, sharing images of me that I don't want on the platform"},{"title": "Illegal & Regulated Behavior","subtext": "Human exploitation, sexual services, drugs, weapons, endangered species, facilitating illegal activity"},{"title": "Spam","subtext": "Fake engagement, scams, fake accounts, malicious links"},{"title": "Suicide or Self-Harm","subtext": "Encouraging, promoting, providing instructions or sharing strategies for self-harm."},{"title": "Sensitive or Disturbing Media","subtext": "Graphic Content, Gratuitous Gore, Adult Nudity & Sexual Behavior, Violent Sexual Conduct, Bestiality & Necrophilia, Media depicting a deceased individual"},{"title": "Impersonation","subtext": "Pretending to be someone else, including non-compliant parody/fan accounts"},{"title": "Violent & Hateful Entities","subtext": "Violent extremism and terrorism, hate groups & networks"}];
  var LOCATIONS = [{"id": "in_app","label": "Here in Lines Police CAD","subtext": "Something written or posted on this website or in the app"},{"id": "discord","label": "On Discord","subtext": "A server, DM or voice call"},{"id": "xbox","label": "On Xbox","subtext": "A party, message or game chat"},{"id": "playstation","label": "On PlayStation","subtext": "A party, message or game chat"},{"id": "in_game","label": "In a game","subtext": "GTA, RDR2 or another game we do not run"},{"id": "elsewhere","label": "Somewhere else","subtext": "Another app or website"}];
  var OFF_HELP = {"discord": {"name": "Discord Trust & Safety", "url": "https://dis.gd/report"}, "xbox": {"name": "Xbox support", "url": "https://support.xbox.com"}, "playstation": {"name": "PlayStation support", "url": "https://www.playstation.com/support"}};
  var FIELDS = {"announcement": [{"name": "title", "label": "Its title"}, {"name": "content", "label": "What it says"}], "announcement_comment": [{"name": "content", "label": "What it says"}], "community_event": [{"name": "title", "label": "Its title"}, {"name": "description", "label": "Its description"}, {"name": "image", "label": "Its image"}], "feature_request": [{"name": "title", "label": "Its title"}, {"name": "description", "label": "What it says"}, {"name": "imageUrls", "label": "Its images"}], "feature_request_comment": [{"name": "content", "label": "What it says"}, {"name": "imageUrls", "label": "Its images"}], "user_profile": [{"name": "username", "label": "Their username"}, {"name": "name", "label": "Their display name"}, {"name": "profilePicture", "label": "Their profile picture"}, {"name": "backgroundImage", "label": "Their background image"}]};

  var MIN_DETAILS = 20, MAX_DETAILS = 2000;
  var CHILD_SAFETY = 'Child Safety', IMPERSONATION = 'Impersonation';
  var STEP_LOC = 0, STEP_OFF = 1, STEP_REASON = 2, STEP_REVIEW = 3, STEP_DONE = 4;

  var root = null, ui = null;
  var state = null;

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function optionButton(attr, value, title, subtext) {
    return '<button type="button" class="rcx-opt" role="radio" aria-checked="false" ' + attr + '="' + esc(value) + '">'
      + '<span><span class="rcx-opt-t">' + esc(title) + '</span>'
      + '<span class="rcx-opt-s">' + esc(subtext) + '</span></span></button>';
  }

  function build() {
    if (root) return;
    var style = document.createElement('style');
    style.textContent = ".rcx-overlay{position:fixed;inset:0;z-index:2200;background:rgba(5,10,18,.72);display:flex;align-items:center;justify-content:center;padding:16px}\n.rcx-overlay[hidden]{display:none}\n.rcx-dialog{width:100%;max-width:540px;max-height:min(86vh,760px);display:flex;flex-direction:column;background:#101826;border:1px solid rgba(255,255,255,.08);border-radius:16px;color:#e2e8f0;box-shadow:0 24px 64px rgba(0,0,0,.5)}\n.rcx-head{display:grid;grid-template-columns:72px 1fr 72px;align-items:center;padding:16px 18px;border-bottom:1px solid rgba(255,255,255,.06)}\n.rcx-head h3{margin:0;text-align:center;font-size:1.05rem;font-weight:700;color:#fff}\n.rcx-link{background:none;border:0;color:#94a3b8;font:inherit;font-size:.9rem;cursor:pointer;padding:4px 0}\n.rcx-link:hover{color:#e2e8f0}\n.rcx-link[hidden]{visibility:hidden;display:block}\n.rcx-body{overflow-y:auto;padding:16px 18px;flex:1}\n.rcx-foot{padding:14px 18px 18px;border-top:1px solid rgba(255,255,255,.06)}\n.rcx-opt{width:100%;display:flex;align-items:flex-start;gap:12px;text-align:left;cursor:pointer;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:14px;margin-bottom:10px;color:inherit;font:inherit}\n.rcx-opt:hover{background:rgba(255,255,255,.05)}\n.rcx-opt[aria-checked=\"true\"]{border-color:rgba(56,189,248,.6);background:rgba(56,189,248,.08)}\n.rcx-opt-t{font-weight:600;color:#fff;margin-bottom:4px}\n.rcx-opt[aria-checked=\"true\"] .rcx-opt-t{color:#38bdf8}\n.rcx-opt-s{font-size:.82rem;color:#94a3b8;line-height:1.45}\n.rcx-lede{font-size:.85rem;color:#94a3b8;line-height:1.5;margin:0 0 14px}\n.rcx-label{font-size:.72rem;letter-spacing:.08em;font-weight:700;color:#94a3b8;display:block;margin-bottom:8px}\n.rcx-sel{background:rgba(56,189,248,.08);border:1px solid rgba(56,189,248,.35);border-radius:12px;padding:14px;color:#fff;font-weight:600;margin-bottom:18px}\n.rcx-ta,.rcx-in{width:100%;box-sizing:border-box;background:rgba(0,0,0,.25);color:#e2e8f0;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:12px 14px;font:inherit;font-size:.92rem}\n.rcx-ta{min-height:120px;resize:vertical}\n.rcx-ta:focus,.rcx-in:focus{outline:none;border-color:rgba(56,189,248,.6)}\n.rcx-fields{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px}\n.rcx-field{display:inline-flex;align-items:center;gap:7px;cursor:pointer;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:9px 12px;font-size:.85rem}\n.rcx-field input{accent-color:#38bdf8;margin:0}\n.rcx-btn{width:100%;border:0;border-radius:12px;padding:13px 16px;font:inherit;font-weight:700;cursor:pointer;color:#fff;background:linear-gradient(90deg,#0ea5e9,#38bdf8)}\n.rcx-btn:disabled{background:#475569;cursor:not-allowed;opacity:.7}\n.rcx-err{color:#f87171;font-size:.85rem;margin:0 0 10px;text-align:center}\n.rcx-err[hidden]{display:none}\n.rcx-done{text-align:center;padding:28px 8px 8px}\n.rcx-done h4{margin:0 0 6px;color:#fff;font-size:1.15rem}\n.rcx-done p{margin:0;color:#94a3b8}\n.rcx-off{display:flex;align-items:center;justify-content:space-between;gap:12px;text-decoration:none;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:14px;color:#e2e8f0;font-weight:600;margin-bottom:10px}\n.rcx-off small{display:block;font-weight:400;color:#94a3b8;margin-top:3px}\n.rcx-note{font-size:.8rem;color:#94a3b8;line-height:1.5;margin:14px 0 0}\n.rcx-note a{color:#38bdf8}\n.report-link{display:inline-flex;align-items:center;gap:5px;background:none;border:0;padding:2px 4px;cursor:pointer;color:#64748b;font:inherit;font-size:.78rem}\n.report-link:hover{color:#f87171}\n@media(max-width:640px){.rcx-overlay{padding:0;align-items:flex-end}.rcx-dialog{max-width:none;max-height:92vh;border-radius:16px 16px 0 0}}";
    document.head.appendChild(style);

    root = document.createElement('div');
    root.className = 'rcx-overlay';
    root.hidden = true;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');

    var locs = LOCATIONS.map(function (l) { return optionButton('data-loc', l.id, l.label, l.subtext); }).join('');
    var reasons = REASONS.map(function (r) { return optionButton('data-reason', r.title, r.title, r.subtext); }).join('');

    root.innerHTML =
      '<div class="rcx-dialog">'
      + '<div class="rcx-head">'
      + '<button type="button" class="rcx-link" data-act="back" hidden>Back</button>'
      + '<h3 data-el="title">Report</h3>'
      + '<button type="button" class="rcx-link" data-act="cancel" style="text-align:right">Cancel</button>'
      + '</div>'
      + '<div class="rcx-body" data-step="0" role="radiogroup">'
      + '<p class="rcx-lede">We can only look at things posted in Lines Police CAD. If it happened somewhere else, we will point you to who can help.</p>'
      + locs + '</div>'
      + '<div class="rcx-body" data-step="1" hidden>'
      + '<div class="rcx-done"><h4>We cannot act on this one</h4><p data-el="offLede"></p></div>'
      + '<div data-el="offLinks" style="margin-top:14px"></div>'
      + '<p class="rcx-note">If someone is in immediate danger, call 911.</p></div>'
      + '<div class="rcx-body" data-step="2" hidden role="radiogroup">' + reasons + '</div>'
      + '<div class="rcx-body" data-step="3" hidden>'
      + '<span class="rcx-label">REPORTED ISSUE</span>'
      + '<div class="rcx-sel" data-el="chosen"></div>'
      + '<span class="rcx-label" data-el="partsLabel">WHICH PART IS THE PROBLEM?</span>'
      + '<div class="rcx-fields" data-el="fields"></div>'
      + '<label class="rcx-label" for="rcxDetails">WHAT HAPPENED</label>'
      + '<textarea id="rcxDetails" class="rcx-ta" maxlength="' + MAX_DETAILS + '" placeholder="What did you see, and where in Lines Police CAD?"></textarea>'
      + '<div data-el="impGroup" hidden style="margin-top:14px">'
      + '<label class="rcx-label" for="rcxImp">WHO ARE THEY PRETENDING TO BE?</label>'
      + '<input type="text" id="rcxImp" class="rcx-in" maxlength="' + MAX_DETAILS + '" placeholder="The real community or person\'s name">'
      + '</div>'
      + '<p class="rcx-note">We take all reports seriously. By submitting this report, you agree that this content goes against our '
      + '<a href="/terms-and-conditions" target="_blank" rel="noopener noreferrer">Terms of Service</a>.</p></div>'
      + '<div class="rcx-body" data-step="4" hidden>'
      + '<div class="rcx-done"><h4 data-el="doneTitle">Report Submitted</h4><p data-el="doneText">Thank you for helping keep our community safe.</p></div></div>'
      + '<div class="rcx-foot"><p class="rcx-err" data-el="err" hidden></p>'
      + '<button type="button" class="rcx-btn" data-act="primary" disabled>Next</button></div>'
      + '</div>';
    document.body.appendChild(root);

    ui = {};
    ['title', 'offLede', 'offLinks', 'chosen', 'fields', 'partsLabel', 'impGroup', 'doneTitle', 'doneText', 'err'].forEach(function (k) {
      ui[k] = root.querySelector('[data-el="' + k + '"]');
    });
    ui.steps = Array.prototype.slice.call(root.querySelectorAll('[data-step]'));
    ui.back = root.querySelector('[data-act="back"]');
    ui.cancel = root.querySelector('[data-act="cancel"]');
    ui.primary = root.querySelector('[data-act="primary"]');
    ui.details = root.querySelector('#rcxDetails');
    ui.imp = root.querySelector('#rcxImp');

    root.addEventListener('click', onClick);
    document.addEventListener('keydown', function (e) {
      if (!root.hidden && e.key === 'Escape') close();
    });
  }

  function onClick(e) {
    if (e.target === root) return close();
    var loc = e.target.closest('[data-loc]');
    if (loc) return pick('location', loc, '[data-loc]', 'data-loc');
    var reason = e.target.closest('[data-reason]');
    if (reason) return pick('reason', reason, '[data-reason]', 'data-reason');
    var act = e.target.closest('[data-act]');
    if (!act) return;
    if (act.dataset.act === 'cancel') return close();
    if (act.dataset.act === 'back') return showStep(state.step === STEP_REVIEW ? STEP_REASON : STEP_LOC);
    if (act.dataset.act === 'primary') return primary();
  }

  function pick(key, button, selector, attr) {
    state[key] = button.getAttribute(attr);
    Array.prototype.forEach.call(root.querySelectorAll(selector), function (b) {
      b.setAttribute('aria-checked', b === button ? 'true' : 'false');
    });
    ui.primary.disabled = false;
  }

  function showStep(n) {
    state.step = n;
    ui.steps.forEach(function (s, i) { s.hidden = i !== n; });
    ui.back.hidden = !(n === STEP_REASON || n === STEP_REVIEW);
    ui.cancel.textContent = (n === STEP_OFF || n === STEP_DONE) ? 'Close' : 'Cancel';
    ui.err.hidden = true;

    if (n === STEP_LOC) { ui.title.textContent = 'Where did this happen?'; ui.primary.textContent = 'Next'; ui.primary.disabled = !state.location; }
    if (n === STEP_OFF) { ui.title.textContent = 'Report'; ui.primary.textContent = 'Done'; ui.primary.disabled = false; }
    if (n === STEP_REASON) { ui.title.textContent = 'Select a reason'; ui.primary.textContent = 'Next'; ui.primary.disabled = !state.reason; }
    if (n === STEP_REVIEW) {
      ui.title.textContent = 'Review Report';
      ui.primary.textContent = 'Submit Report';
      ui.primary.disabled = false;
      ui.chosen.textContent = state.reason;
      ui.impGroup.hidden = state.reason !== IMPERSONATION;
      if (ui.impGroup.hidden) ui.imp.value = '';
    }
    if (n === STEP_DONE) { ui.title.textContent = 'Report'; ui.primary.textContent = 'Done'; ui.primary.disabled = false; }
  }

  // Where to send someone whose report is not about this product. Child safety
  // goes to NCMEC wherever it happened: they take reports from anyone.
  function showOffPlatform() {
    var help = OFF_HELP[state.location];
    ui.offLede.textContent = 'This did not happen in Lines Police CAD, so we cannot see it or verify it. '
      + (help ? 'Report it to ' + help.name + ', who can.' : 'Report it to whoever runs the app or site it happened on.');
    var html = '';
    if (help) {
      html += '<a class="rcx-off" href="' + esc(help.url) + '" target="_blank" rel="noopener noreferrer">'
        + '<span>Report to ' + esc(help.name) + '<small>' + esc(help.url) + '</small></span></a>';
    }
    if (!state.reason || state.reason === CHILD_SAFETY) {
      html += '<a class="rcx-off" href="https://report.cybertip.org" target="_blank" rel="noopener noreferrer">'
        + '<span>Child safety, anywhere: NCMEC CyberTipline<small>report.cybertip.org</small></span></a>';
    }
    ui.offLinks.innerHTML = html;
    showStep(STEP_OFF);
  }

  function primary() {
    if (state.step === STEP_LOC) {
      if (!state.location) return;
      // Nothing is filed for another platform. We point them at it instead.
      if (state.location !== 'in_app') return showOffPlatform();
      return showStep(STEP_REASON);
    }
    if (state.step === STEP_REASON) { if (state.reason) showStep(STEP_REVIEW); return; }
    if (state.step === STEP_OFF || state.step === STEP_DONE) return close();
    submit();
  }

  function fail(message, field) {
    ui.err.textContent = message;
    ui.err.hidden = false;
    if (field) { field.style.borderColor = '#f87171'; field.focus(); }
  }

  function submit() {
    if (state.sending) return;
    if (ui.details.value.trim().length < MIN_DETAILS) {
      return fail('Please describe what you saw, in at least ' + MIN_DETAILS + ' characters.', ui.details);
    }
    ui.details.style.borderColor = '';
    if (state.reason === IMPERSONATION && !ui.imp.value.trim()) {
      return fail('Tell us who they are pretending to be.', ui.imp);
    }
    ui.imp.style.borderColor = '';

    state.sending = true;
    ui.primary.disabled = true;
    ui.primary.textContent = 'Submitting…';
    ui.err.hidden = true;

    var ticked = Array.prototype.slice.call(ui.fields.querySelectorAll('input:checked')).map(function (b) { return b.value; });

    fetch('/report/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        kind: state.target.kind,
        id: state.target.id,
        parentId: state.target.parentId || '',
        communityId: state.target.communityId || '',
        reason: state.reason,
        location: state.location,
        details: ui.details.value,
        impersonatedName: ui.imp.value,
        fields: ticked
      })
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          if (!res.ok) throw new Error((body && body.message) || 'Failed to submit report. Please try again.');
          return body;
        });
      })
      .then(function (body) {
        // A repeat is not stored, so it must not be announced as a new report.
        if (body && body.duplicate) {
          ui.doneTitle.textContent = 'Already reported';
          ui.doneText.textContent = "You've already reported this. Our team will review it, and you can report it again once they have.";
        } else {
          ui.doneTitle.textContent = 'Report Submitted';
          ui.doneText.textContent = 'Thank you for helping keep our community safe.';
        }
        showStep(STEP_DONE);
      })
      .catch(function (err) {
        ui.primary.disabled = false;
        ui.primary.textContent = 'Submit Report';
        fail(err.message || 'Failed to submit report. Please try again.');
      })
      .then(function () { state.sending = false; });
  }

  function close() {
    root.hidden = true;
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    if (state && state.lastFocus && state.lastFocus.focus) state.lastFocus.focus();
  }

  window.reportContent = function (target) {
    if (!target || !target.kind || !target.id) return;
    build();

    state = { step: STEP_LOC, location: '', reason: '', sending: false, target: target, lastFocus: document.activeElement };

    ui.details.value = '';
    ui.imp.value = '';
    ui.details.style.borderColor = '';
    ui.imp.style.borderColor = '';
    Array.prototype.forEach.call(root.querySelectorAll('[aria-checked]'), function (b) {
      b.setAttribute('aria-checked', 'false');
    });

    var fields = FIELDS[target.kind] || [];
    ui.fields.innerHTML = fields.map(function (f) {
      return '<label class="rcx-field"><input type="checkbox" value="' + esc(f.name) + '"><span>' + esc(f.label) + '</span></label>';
    }).join('');
    // Nothing to choose between, so do not ask.
    var hideParts = fields.length < 2;
    ui.fields.hidden = hideParts;
    ui.partsLabel.hidden = hideParts;

    showStep(STEP_LOC);
    root.hidden = false;
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    ui.cancel.focus();
  };
})();
