/**
 * Shared "full penal code description" modal — window.PenalCodeInfo.
 *
 * Long descriptions were getting cut off wherever officers pick or read penal
 * codes: a Select2 <option> drops the text entirely, and the reference tables
 * truncate the cell to a native title tooltip. This puts the whole thing in a
 * scrollable modal behind a small info control on each row.
 *
 * Shape of a penal code (police-cad-api/models/community.go PenalCodeViolation):
 * { name, jailTime, fine, explanation }. There is no separate code field, so
 * `code` below is accepted but absent in today's data, and the modal title
 * falls back to the name alone.
 *
 * Needs window.ddModal on the page (views/partials/dd-modal.ejs, or the
 * dashboards' own implementations — same signature).
 *
 * Usage:
 *   html += '<span>' + esc(v.name) + '</span>' +
 *     PenalCodeInfo.controlHtml({ name: v.name, description: v.explanation });
 *
 * Keep in sync with police-cad-app/components/PenalCodeDescriptionModal.js.
 */
(function (window, document) {
  'use strict';

  if (window.PenalCodeInfo) return;

  var ATTR = 'data-pci-info';
  var STYLE_ID = 'pci-styles';

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /*
   * Styles ship with the helper rather than with each page: the reference
   * tables, the Select2 dropdowns and the command dashboard's forms all show
   * the same control, and those pages do not share a stylesheet.
   *
   * .pci-desc is a block-level span on purpose — ddModal's message slot is a
   * <p>, and a <div> there would close it and drop the text out of the modal.
   */
  function injectStyles() {
    if (!document || document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.pci-info{display:inline-flex;align-items:center;justify-content:center;',
      'width:20px;height:20px;padding:0;margin-left:6px;flex:0 0 auto;',
      'border:none;border-radius:50%;background:rgba(56,189,248,0.14);',
      'color:#38bdf8;font-size:11px;line-height:1;cursor:pointer;vertical-align:middle;}',
      '.pci-info:hover,.pci-info:focus{background:rgba(56,189,248,0.28);color:#7dd3fc;outline:none;}',
      '.pci-info:focus-visible{box-shadow:0 0 0 2px rgba(56,189,248,0.5);}',
      '.pci-desc{display:block;max-height:50vh;overflow-y:auto;',
      'white-space:pre-wrap;overflow-wrap:break-word;text-align:left;}',
      '.pci-empty{display:block;text-align:left;opacity:0.7;font-style:italic;}',
    ].join('');
    document.head.appendChild(style);
  }

  function modalTitle(code) {
    var num = code && code.code != null ? String(code.code).trim() : '';
    var name = code && code.name != null ? String(code.name).trim() : '';
    if (num && name) return num + ' ' + name;
    return num || name;
  }

  function modalBody(code) {
    var text = code && code.description != null ? String(code.description).trim() : '';
    if (!text) return '<span class="pci-empty">No description.</span>';
    // Escaped, then rendered with pre-wrap so the author's own line breaks
    // survive without the text being able to turn into markup.
    return '<span class="pci-desc">' + escapeHtml(text) + '</span>';
  }

  /** @param {{code?: string, name: string, description?: string}} code */
  function open(code) {
    if (typeof window.ddModal !== 'function') return false;
    injectStyles();
    window.ddModal({
      type: 'info',
      icon: 'fa-gavel',
      title: modalTitle(code),
      message: modalBody(code),
      buttons: [{ label: 'Close', class: 'ddm-btn-secondary' }],
    });
    return true;
  }

  /**
   * HTML for the info control on one row. The description rides along in a
   * data attribute, escaped, so there is no state to keep in step with rows
   * that are rebuilt on every render — and so a description full of quotes and
   * angle brackets cannot break out of the attribute.
   *
   * @param {{code?: string, name: string, description?: string}} code
   * @returns {string}
   */
  function controlHtml(code) {
    injectStyles();
    var attrs = ' ' + ATTR + '="1"' +
      ' data-pci-name="' + escapeHtml(code && code.name) + '"' +
      ' data-pci-desc="' + escapeHtml(code && code.description) + '"';
    if (code && code.code) attrs += ' data-pci-code="' + escapeHtml(code.code) + '"';
    return '<button type="button" class="pci-info"' + attrs +
      ' aria-label="View description" title="View description">' +
      '<i class="fa fa-info-circle" aria-hidden="true"></i></button>';
  }

  /** The same control as a DOM node. */
  function controlNode(code) {
    var wrap = document.createElement('span');
    wrap.innerHTML = controlHtml(code);
    return wrap.firstChild;
  }

  function codeFromControl(control) {
    return {
      code: control.getAttribute('data-pci-code') || '',
      name: control.getAttribute('data-pci-name') || '',
      description: control.getAttribute('data-pci-desc') || '',
    };
  }

  /**
   * A Select2 `templateResult` for a charges picker: the option's own text,
   * plus the info control when its <option> carries data-explain.
   *
   * Returning a node rather than a string also bypasses Select2's
   * escapeMarkup, which would otherwise render the control as literal text.
   *
   * @param {function} $ jQuery, so the caller's instance is the one used
   */
  function select2Result($) {
    return function (data) {
      var el = data && data.element;
      var explain = el && el.getAttribute ? el.getAttribute('data-explain') : '';
      var text = data && data.text != null ? data.text : '';
      var row = document.createElement('span');
      row.appendChild(document.createTextNode(text));
      if (explain) row.appendChild(controlNode({ name: text, description: explain }));
      return $(row);
    };
  }

  /**
   * Builds an <option> for a charges picker, carrying its description.
   *
   * Replaces string concatenation that put the violation name straight into
   * markup — a name with a quote in it silently broke the option.
   *
   * @param {function} $ jQuery
   * @param {{name: string, explanation?: string}} violation
   */
  function option($, violation) {
    var name = violation && violation.name != null ? String(violation.name) : '';
    var $opt = $('<option></option>').attr('value', name).text(name);
    if (violation && violation.explanation) $opt.attr('data-explain', violation.explanation);
    return $opt;
  }

  function controlFor(target) {
    if (!target || !target.closest) return null;
    return target.closest('[' + ATTR + ']');
  }

  /*
   * Every listener here is in the CAPTURE phase at the document, which is the
   * whole trick: the control sits inside something that is itself clickable,
   * and the two surfaces listen at different points.
   *
   *   - Select2 selects an option on `mouseup`, delegated from its results
   *     container.
   *   - The command dashboard's charge rows bind `click` directly on the row,
   *     which is the control's own ancestor.
   *
   * Either way a listener attached to the button fires too late — the
   * ancestor's handler has already run and the charge is selected. Capturing
   * at the document means the event is stopped before it reaches any of them.
   */
  function stop(e) {
    e.stopPropagation();
    e.preventDefault();
  }

  function suppress(e) {
    if (controlFor(e.target)) stop(e);
  }

  function onClick(e) {
    var control = controlFor(e.target);
    if (!control) return;
    stop(e);
    open(codeFromControl(control));
  }

  if (document && document.addEventListener) {
    document.addEventListener('mousedown', suppress, true);
    document.addEventListener('mouseup', suppress, true);
    document.addEventListener('click', onClick, true);
    // Keyboard activation does not produce the mouse events above, so the
    // control stays reachable without a pointer.
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var control = controlFor(e.target);
      if (!control) return;
      stop(e);
      open(codeFromControl(control));
    }, true);
  }

  window.PenalCodeInfo = {
    open: open,
    controlHtml: controlHtml,
    controlNode: controlNode,
    select2Result: select2Result,
    option: option,
    modalTitle: modalTitle,
    modalBody: modalBody,
    escapeHtml: escapeHtml,
    // Test seams.
    _codeFromControl: codeFromControl,
    _attr: ATTR,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.PenalCodeInfo;
  }
})(typeof window !== 'undefined' ? window : globalThis, typeof document !== 'undefined' ? document : null);
